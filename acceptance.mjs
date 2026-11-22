import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { openBrowser } from './browser.mjs';
import { sourceSections } from './page-checks.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'output', 'mcp');
const python = process.env.UNSLICED_PYTHON || 'python3';
process.env.PYTHONUTF8 = '1';
await mkdir(output, { recursive: true });
function toolProcess(directory, keepSource) {
  const client = new Client({ name: 'unsliced-acceptance', version: '1.0.0' });
  const env = { ...process.env, UNSLICED_OUTPUT_DIR: directory };
  if (keepSource) env.UNSLICED_KEEP_SOURCE = '1';
  else delete env.UNSLICED_KEEP_SOURCE;
  const transport = new StdioClientTransport({
    command: process.execPath, args: [process.env.UNSLICED_TEST_MCP_ENTRY || join(root, 'packages/mcp/server.mjs')],
    env, stderr: 'inherit'
  });
  const call = args => client.callTool({ name: 'create_pdf', arguments: args }, undefined, {
    timeout: 350_000, resetTimeoutOnProgress: true, onprogress: ({ message }) => console.error(message)
  });
  return { client, transport, call };
}

async function withTool(directory, keepSource, test) {
  const { client, transport, call } = toolProcess(directory, keepSource);
  try {
    await client.connect(transport);
    await test(call);
  } finally {
    await client.close();
  }
}

async function checkArchive(longMarkdown) {
  const temporary = await mkdtemp(join(tmpdir(), 'unsliced-source-test-'));
  const filename = '归档例子';
  const create = async (call, args = { markdown: '测试原稿。' }) => {
    const response = await call({ filename, ...args });
    assert.equal(response.isError, undefined, JSON.stringify(response));
    const result = response.structuredContent;
    assert.equal((await readFile(result.path)).subarray(0, 5).toString(), '%PDF-');
    return result;
  };
  try {
    const off = join(temporary, 'off');
    await withTool(off, false, async call => {
      const result = await create(call);
      assert.deepEqual(await readdir(off), [basename(result.path)]);
      assert.deepEqual(result.warnings, []);
    });
    const on = join(temporary, 'on');
    const sources = join(on, 'sources');
    await withTool(on, true, async call => {
      const markdown = '\r\n' + longMarkdown.replaceAll('\n', '\r\n') + '\r\n \t';
      const html = '\r\n <!-- 原稿注释 -->\r\n <main data-unsliced-root><p>HTML 原稿。</p></main> \t\r\n';
      async function verify(args, stem, extension) {
        const result = await create(call, args);
        assert.equal(basename(result.path), stem + '.pdf');
        assert.deepEqual(result.warnings, []);
        assert.deepEqual(await readFile(join(sources, stem + extension)), Buffer.from(args.markdown ?? args.html));
        const { generated_at, paper_size, pagination, pages, whitespace, splits, browser_version } =
          JSON.parse(await readFile(join(sources, stem + '.json'), 'utf8'));
        assert.equal(new Date(generated_at).toISOString(), generated_at);
        assert.equal(paper_size, args.paper_size ?? 'A4');
        assert.deepEqual(pagination, { strategy: 'optimal', parameters: { freeLines: 2, growth: 1.18, cap: 1e6,
          fixedLines: 15, tableSplitLines: 15, reservePx: 4, minTableRows: 2, keepHeadings: true } });
        assert.deepEqual({ pages, whitespace, splits }, { pages: result.pages, whitespace: result.whitespace, splits: result.splits });
        assert.match(browser_version, /^\d+\.\d+/u);
        return result;
      }
      const long = await verify({ markdown }, filename, '.md');
      assert.ok(long.splits.length);
      await verify({ html, paper_size: 'A5' }, filename + '-2', '.html');
      assert.deepEqual(new Set(await readdir(sources)), new Set([
        filename + '.md', filename + '.json', filename + '-2.html', filename + '-2.json'
      ]));
      // An archive may outlive its PDF; reusing that stem would pair it with the wrong source.
      await rm(long.path);
      await verify({ html }, filename + '-3', '.html');
      assert.deepEqual(await readFile(join(sources, filename + '.md')), Buffer.from(markdown));
    });
    const failed = join(temporary, 'failed');
    await mkdir(failed);
    await writeFile(join(failed, 'sources'), '保留原文件');
    await withTool(failed, true, async call => {
      const result = await create(call);
      assert.match(result.report, /原稿或生成记录未能保存/u);
      assert.deepEqual(result.warnings, ['原稿或生成记录未能保存，PDF 已正常生成。']);
      assert.equal(await readFile(join(failed, 'sources'), 'utf8'), '保留原文件');
    });
    console.log('MCP 原稿归档：默认关闭、原样保存、同名编号和失败后继续生成均通过');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

const { client, transport, call } = toolProcess(output, false);
let browser;
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
try {
  await client.connect(transport);
  assert.deepEqual((await client.listTools()).tools.map(tool => tool.name), ['create_pdf']);
  const cases = [
    { name: 'markdown-基础', input: { markdown: '# 中文标题\n\n完整段落。\n\n- 项目一\n- 项目二\n\n> 原文引用\n\n```js\nconst ready = true;\n```\n\n![印章](' + image + ')', paper_size: 'A5' },
      expected: '中文标题完整段落。项目一项目二原文引用const ready = true;' },
    { name: 'markdown-长表', input: { markdown: '# 季度巡检\n\n| 序号 | 结果 |\n| --- | --- |\n' +
      Array.from({ length: 62 }, (_, i) => '| ' + (i+1) + ' | 检查通过 |').join('\n') },
      expected: '季度巡检序号结果' + Array.from({ length: 62 }, (_, i) => (i+1) + '检查通过').join(''), split: true },
  ];
  for (const [name, selector] of [['report-genius-factory','#rpt'], ['table-long','main']]) {
    let html = await readFile(join(root, 'samples', name + '.html'), 'utf8');
    if (name === 'table-long') {
      const css = await readFile(join(root, 'samples/table-samples.css'), 'utf8');
      html = html.replace('<link rel="stylesheet" href="table-samples.css">', '<style>' + css + '</style>');
    }
    cases.push({ name, input: { html }, selector, split: name === 'table-long' });
  }
  for (const sample of cases) {
    const result = await call({ filename: sample.name, ...sample.input });
    assert.equal(result.isError, undefined, JSON.stringify(result));
    const { path, pages, whitespace, splits, warnings, repeated_headers } = result.structuredContent;
    assert.equal(whitespace.length, pages);
    assert.deepEqual(warnings, []);
    if (sample.split) assert(splits.some(slice => slice.repeated_header));
    let sections = [{ label: sample.name, text: sample.expected }];
    if (sample.selector) {
      browser ??= await openBrowser(console.error);
      const source = await browser.newPage();
      try {
        await source.emulateMedia({ media: 'print' });
        await source.setContent(sample.input.html);
        sections = await sourceSections(source, sample.selector);
      } finally { await source.close(); }
    }
    const text = JSON.parse(execFileSync(python, [join(root, 'scripts/verify_pdf_text.py'), path], {
      encoding: 'utf8', input: JSON.stringify({ sections,
        headers: repeated_headers })
    }));
    assert.deepEqual(text.differences, []);
    assert.equal(text.pages, pages);
    assert(text.embeddedFonts.some(font => font.includes('UnslicedSansSC')));
    if (sample.input.paper_size === 'A5') {
      const [width, height] = text.paperPoints;
      assert(Math.abs(width - 419.53) < 1 && Math.abs(height - 595.28) < 1);
    }
    execFileSync(python, [join(root, 'scripts/render_pdf_pages.py'), path, path.slice(0, -4), '100']);
    console.log('MCP 验收通过', sample.name, pages + ' 页', path);
  }
  const incomplete = await call({ markdown: '这份报告的结论是因为', filename: '截断提示' });
  assert.match(incomplete.structuredContent.warnings.join(' '), /可能被截断/u);
  assert((await call({ markdown: '![图片](https://example.com/trial.png)', filename: 'external' })).isError);
  assert((await call({ markdown: '文', html: '<p>文</p>', filename: 'wrong' })).isError);
  assert((await call({ markdown: '文', filename: '../bad' })).isError);
  await checkArchive(cases[1].input.markdown);
} finally {
  await client.close();
  await browser?.close();
}
