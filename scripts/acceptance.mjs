import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { generatePdf } from '../packages/playwright/dist/index.js';

const project = fileURLToPath(new URL('../', import.meta.url));
const samples = join(project, 'samples');
const output = join(project, 'output', 'acceptance');
const textVerifier = join(project, 'scripts', 'verify_pdf_text.py');
const python = process.env.KERF_PYTHON || 'python3';
const cases = {
  'breakflow-report-zh.html': { selector: '#community-report', expectBundledFont: true },
  'invoice.html': { selector: '#invoice-container' },
  'root-text.html': { selector: '#report' },
  'root-font-size.html': {
    selector: '#report',
    styles: [
      { selector: '#styled-heading', property: 'font-size', value: '42px' },
      { selector: '#styled-paragraph', property: 'font-size', value: '19px' }
    ]
  },
  'block-limit.html': { selector: '#report', expectedError: /Pagination exceeded maximum iterations \(500\)/u }
};

const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf'
};

async function startSampleServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = resolve(samples, '.' + pathname);
      if (!file.startsWith(samples + sep)) {
        response.writeHead(404).end();
        return;
      }
      const contents = await readFile(file);
      response.setHeader('Content-Type', contentTypes[extname(file)] ?? 'application/octet-stream');
      response.end(contents);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', done);
  });
  return server;
}

async function prepareOutput(directory) {
  await mkdir(directory, { recursive: true });
  for (const name of await readdir(directory)) {
    if (name === 'document.pdf' || /^page-\d+\.png$/u.test(name)) {
      await unlink(join(directory, name));
    }
  }
}

async function sourceSections(page, selector) {
  return page.locator(selector).evaluate(root => {
    function visibleText(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.data;
      if (!(node instanceof Element)) return '';
      const tag = node.tagName.toLowerCase();
      if (['script', 'style', 'template', 'noscript', 'title', 'desc'].includes(tag)) return '';
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return '';
      return Array.from(node.childNodes, visibleText).join('');
    }

    let heading = '';
    const sections = [];
    for (const [index, node] of Array.from(root.childNodes).entries()) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const label = `第 ${index + 1} 个子节点的裸文本`;
        sections.push({ label: heading ? `${heading} / ${label}` : label, text: node.textContent });
        continue;
      }
      if (!(node instanceof Element)) continue;
      const tag = node.tagName.toLowerCase();
      const text = visibleText(node);
      if (!text?.trim()) continue;
      const label = node.id ? `#${node.id}` : `<${tag}> 第 ${index + 1} 个子节点`;
      if (/^h[1-6]$/u.test(tag)) heading = text.trim().slice(0, 48);
      sections.push({ label: heading ? `${heading} / ${label}` : label, text });
    }
    return sections;
  });
}

async function boxOverflow(page) {
  return page.locator('.breakflow-page-content').evaluateAll(pages => pages.flatMap((content, index) => {
    const box = content.getBoundingClientRect();
    const style = getComputedStyle(content);
    const bottom = box.bottom - Number.parseFloat(style.paddingBottom);
    return Array.from(content.querySelectorAll('[data-breakflow-node-id]')).filter(node => {
      const nodeBox = node.getBoundingClientRect();
      return nodeBox.height > 0 && nodeBox.bottom > bottom + 2;
    }).map(node => `第 ${index + 1} 页的 ${node.id ? '#' + node.id : node.tagName.toLowerCase()} 超出可排版范围`);
  }));
}

async function checkSample(browser, url, filename) {
  const spec = cases[filename] ?? {};
  const directory = join(output, filename.slice(0, -'.html'.length));
  const pdf = join(directory, 'document.pdf');
  const row = { filename, directory, details: [] };
  await prepareOutput(directory);
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  try {
    await page.emulateMedia({ media: 'print' });
    await page.goto(url, { waitUntil: 'networkidle' });
    const selector = spec.selector ?? await page.evaluate(() => {
      if (document.querySelectorAll('[data-kerf-root]').length === 1) return '[data-kerf-root]';
      const body = document.body;
      const visibleChildren = Array.from(body.children).filter(element =>
        !element.matches('script, style, template, noscript') &&
        getComputedStyle(element).display !== 'none' &&
        getComputedStyle(element).visibility !== 'hidden'
      );
      const hasBareText = Array.from(body.childNodes).some(node =>
        node.nodeType === Node.TEXT_NODE && node.textContent.trim()
      );
      if (!hasBareText && visibleChildren.length === 1 && visibleChildren[0].matches('main, article')) {
        const index = Array.from(body.children).indexOf(visibleChildren[0]) + 1;
        return `body > :nth-child(${index})`;
      }
      return 'body';
    });
    const sections = await sourceSections(page, selector);
    let result;
    try {
      ({ result } = await generatePdf({ url, selector, output: pdf, playwrightPage: page, settleTimeoutMs: 0 }));
    } catch (error) {
      if (!spec.expectedError?.test(error.message)) throw error;
      const generated = await readdir(directory);
      if (generated.includes('document.pdf')) throw new Error('超限后留下了不完整的 PDF。');
      row.expectedError = error.message.split('\n')[0];
      return row;
    }

    execFileSync('pdftoppm', ['-r', '120', '-png', pdf, join(directory, 'page')]);
    const text = JSON.parse(execFileSync(python, [textVerifier, pdf], {
      encoding: 'utf8', input: JSON.stringify(sections)
    }));
    row.pages = text.pages;
    row.textMatches = text.differences.length === 0;
    row.whitespace = result.pages.map(entry => (100 * entry.remainingSpace / entry.availableHeight).toFixed(1) + '%');
    row.splits = new Set(result.pages.flatMap(entry => entry.items
      .filter(item => item.isPartial || item.tableSplit?.isSplit).map(item => item.nodeId))).size;
    row.splits += result.fixes.filter(fix => fix.type === 'split-oversized-element').length;
    row.orphans = result.pages.slice(0, -1).filter(entry => /^h[1-6]$/iu.test(entry.items.at(-1)?.tagName ?? '')).length;
    row.details.push(...text.differences);
    if (spec.expectBundledFont && !text.embeddedFonts.some(name => /KerfSansSC/u.test(name))) {
      row.details.push('未在 PDF 中发现嵌入的 Kerf Sans SC 字体。');
    } else if (spec.expectBundledFont) {
      row.notes = ['PDF 已嵌入随项目分发的 Kerf Sans SC。'];
    }
    row.details.push(...await boxOverflow(page));
    row.details.push(...result.issues.filter(issue => issue.severity === 'error').map(issue => issue.message));
    if (text.pages !== result.pageCount) row.details.push(`分页计划为 ${result.pageCount} 页，实际 PDF 为 ${text.pages} 页。`);
    const imageCount = (await readdir(directory)).filter(name => /^page-\d+\.png$/u.test(name)).length;
    if (imageCount !== text.pages) row.details.push(`生成了 ${imageCount} 张页面图片，应有 ${text.pages} 张。`);
    if (row.splits) row.details.push(`有 ${row.splits} 个内容块被拆开。`);
    if (row.orphans) row.details.push(`有 ${row.orphans} 个标题落在页底，与后续内容分开。`);
    if (spec.expectedError) row.details.push('预期因超过处理上限而明确报错，但生成了 PDF。');
    for (const style of spec.styles ?? []) {
      const values = await page.locator('.breakflow-page ' + style.selector).evaluateAll(
        (nodes, property) => nodes.map(node => getComputedStyle(node).getPropertyValue(property)), style.property
      );
      if (values.length === 0 || values.some(value => value !== style.value)) {
        row.details.push(`${style.selector} 的 ${style.property} 实际为 ${values.join('、') || '缺失'}，应为 ${style.value}。`);
      } else {
        (row.notes ??= []).push(`${style.selector} 的字号经浏览器确认是 ${style.value}。`);
      }
    }
  } catch (error) {
    row.details.push(error.message.split('\n')[0]);
  } finally {
    await page.close();
  }
  return row;
}

function renderReport(rows) {
  const lines = [
    '# Kerf 排版验收', '',
    '留白以可排版高度为基准。最后一页单列，留白不计为缺点。',
    '有切块、页底标题、内容越界、页数不一致、文字差异或意外错误时，验收失败。', '',
    '| 样例 | 结果 | PDF 页数 | 前几页留白 | 最后一页留白 | 切开的块 | 页底标题 | 文字核对 |',
    '| --- | --- | ---: | --- | ---: | ---: | ---: | --- |'
  ];
  for (const row of rows) {
    const status = row.details.length ? '失败' : row.expectedError ? '通过（按预期拒绝）' : '通过';
    const link = row.pages ? `[${row.filename}](${relative(output, row.directory)}/document.pdf)` : row.filename;
    const textStatus = row.textMatches === undefined ? '—' : row.textMatches ? '完全一致' : '有差异，见下方';
    lines.push(`| ${link} | ${status} | ${row.pages ?? '—'} | ${row.whitespace?.slice(0, -1).join('、') || '—'} | ${row.whitespace?.at(-1) ?? '—'} | ${row.splits ?? '—'} | ${row.orphans ?? '—'} | ${textStatus} |`);
  }
  for (const row of rows) {
    const details = [...row.details, ...(row.notes ?? [])];
    if (row.expectedError) details.unshift(row.expectedError);
    if (details.length) lines.push('', `## ${row.filename}`, '', ...details.map(detail => '- ' + detail));
  }
  return lines.join('\n') + '\n';
}

execFileSync(python, ['-c', 'import pypdf'], { stdio: 'inherit' });
execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' });
const names = (await readdir(samples, { recursive: true })).filter(name => name.endsWith('.html')).sort();
if (!names.length) throw new Error('samples/ 下找不到 HTML 验收样例。');
await mkdir(output, { recursive: true });
const server = await startSampleServer();
let browser;
try {
  browser = await chromium.launch(process.env.KERF_CHROMIUM
    ? { executablePath: process.env.KERF_CHROMIUM }
    : {});
  const rows = [];
  const base = 'http://127.0.0.1:' + server.address().port;
  for (const name of names) {
    const path = name.split(sep).map(encodeURIComponent).join('/');
    rows.push(await checkSample(browser, base + '/' + path, name));
  }
  const report = renderReport(rows);
  await writeFile(join(output, 'report.md'), report);
  process.stdout.write(report);
  process.exitCode = rows.some(row => row.details.length) ? 1 : 0;
} finally {
  await browser?.close();
  server.close();
}
