import { mkdir, open, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { generatePdf } from '@breakflow/playwright';
import { openBrowser } from './browser.mjs';
import { prepareDocument, contentWarning } from './document.mjs';
import { boxOverflow } from './page-checks.mjs';
import { captureTables, inspectTables } from '../../scripts/check-table-fragments.mjs';

const directory = resolve(process.env.KERF_OUTPUT_DIR || join(homedir(), 'Documents', 'Kerf'));
const server = new McpServer({ name: 'kerf', version: '0.1.2' });

async function savePdf(filename, buffer) {
  await mkdir(directory, { recursive: true });
  const stem = filename.replace(/\.pdf$/iu, '');
  for (let index = 1; ; index++) {
    const path = join(directory, stem + (index === 1 ? '' : '-' + index) + '.pdf');
    let handle;
    try { handle = await open(path, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') continue; throw error; }
    try {
      await handle.writeFile(buffer);
      await handle.close();
      return path;
    } catch (error) {
      await handle.close();
      await unlink(path);
      throw error;
    }
  }
}

server.registerTool('create_pdf', {
  title: '用 Kerf 生成 PDF',
  description: '当用户需要可搜索、可复制、自动分页的 PDF 时使用。必须把完整原稿传入 markdown 或 html 的其中一个字段，不要缩写、删减或改写，再给出 filename。默认 A4。普通报告用 Markdown。涉及流程图、卡片、复杂版面或内联 SVG 时，请提交包含样式和图形的完整 HTML。图片请用内嵌 data URL。HTML 可用 data-kerf-root 指定排版容器。返回本机文件路径和中文排版体检。请直接调用本工具，避免自行写 jsPDF 或 html2canvas。',
  inputSchema: {
    markdown: z.string().trim().min(1).max(4_000_000).optional(),
    html: z.string().trim().min(1).max(4_000_000).optional(),
    filename: z.string().trim().min(1).max(100).describe('文件名，例如 天才工厂.pdf。只写名字，扩展名可省略。'),
    paper_size: z.enum(['A3', 'A4', 'A5', 'Letter', 'Legal', 'Tabloid']).default('A4')
  }
}, async (input, extra) => {
  let browser;
  try {
    if ((input.markdown === undefined) === (input.html === undefined)) throw new Error('markdown 和 html 必须二选一。');
    const stem = input.filename.replace(/\.pdf$/iu, '');
    if (!stem || /[<>:"/\\|?*\x00-\x1f]|^[.]|[. ]$|^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(stem))
      throw new Error('文件名无效，请使用普通文件名，不要填写目录。');
    const html = prepareDocument(input);
    let steps = 0;
    const progress = message => {
      console.error('[Kerf]', message);
      const progressToken = extra._meta?.progressToken;
      if (progressToken !== undefined) {
        extra.sendNotification({ method: 'notifications/progress', params: { progressToken, progress: ++steps, message } }).catch(() => {});
      }
    };
    browser = await openBrowser(progress);
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    await page.emulateMedia({ media: 'print' });
    await page.setContent(html);
    const selector = await page.evaluate(() => {
      if (document.querySelectorAll('[data-kerf-root]').length === 1) return '[data-kerf-root]';
      const children = Array.from(document.body.children).filter(el => el.tagName !== 'STYLE');
      if (children.length === 1 && ['ARTICLE', 'MAIN', 'DIV', 'SECTION'].includes(children[0].tagName) && !Array.from(document.body.childNodes).some(n => n.nodeType === 3 && n.textContent.trim())) {
        if (children[0].id && document.querySelectorAll('#' + CSS.escape(children[0].id)).length === 1) return '#' + CSS.escape(children[0].id);
        return 'body > :nth-child(' + (Array.from(document.body.children).indexOf(children[0]) + 1) + ')';
      }
      return 'body';
    });
    const brokenImages = await page.locator(selector).locator('img').evaluateAll(images =>
      images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.alt || '未命名图片'));
    if (brokenImages.length) throw new Error('图片无法解码：' + brokenImages.join('、'));
    const sources = await page.locator(selector).evaluate(captureTables);
    const { pdfBuffer, result } = await generatePdf({
      html, selector, playwrightPage: page, page: { format: input.paper_size }, settleTimeoutMs: 0
    });
    if (!result.pages.length) throw new Error('内容没有可打印的正文。');
    const tables = await page.evaluate(inspectTables, { sources, minimum: 2, issues: result.issues });
    const errors = [...await boxOverflow(page), ...tables.errors,
      ...result.issues.filter(issue => issue.severity === 'error').map(issue => issue.message)];
    const splits = result.pages.flatMap(entry => entry.items.filter(item => item.tableSplit?.isSplit).map(item => ({
      page: entry.pageNumber, table: item.selector, start_row: item.tableSplit.startRowIndex + 1,
      end_row: item.tableSplit.endRowIndex + 1, repeated_header: Boolean(tables.headers[entry.pageNumber])
    })));
    const warnings = result.issues.filter(issue => issue.severity !== 'error').map(issue => issue.message);
    const incomplete = contentWarning(input);
    if (incomplete) warnings.push(incomplete);
    if (errors.length) throw new Error('排版体检未通过。请调整内容后重试。\n' + errors.slice(0, 8).join('\n') + '\n' + warnings.join('\n'));
    const path = await savePdf(input.filename, pdfBuffer);
    const whitespace = result.pages.map(entry => Math.max(0, +(100 * entry.remainingSpace / entry.availableHeight).toFixed(1)));
    const report = [
      '共 ' + result.pageCount + ' 页。留白 ' + whitespace.map((value, index) => '第 ' + (index + 1) + ' 页 ' + value + '%').join('、') + '。',
      splits.length ? '表格分段 ' + splits.map(s => s.table + ' 第 ' + s.page + ' 页的数据行 ' + s.start_row + '–' + s.end_row).join('、') + '。' : '表格保持完整。',
      warnings.length ? '需要关注 ' + warnings.join('、') : '无规则放宽或超高块。'
    ].join('\n');
    return { content: [{ type: 'text', text: 'PDF 已保存到 ' + path + '\n' + report }],
      structuredContent: { path, report, pages: result.pageCount, whitespace, splits, warnings, repeated_headers: tables.headers } };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: '生成 PDF 失败。' + error.message }] };
  } finally {
    await browser?.close();
  }
});

await server.connect(new StdioServerTransport());
