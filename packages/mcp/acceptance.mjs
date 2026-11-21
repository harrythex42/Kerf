import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { openBrowser } from './browser.mjs';
import { sourceSections } from './page-checks.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'output', 'mcp');
const python = process.env.KERF_PYTHON || 'python3';
await mkdir(output, { recursive: true });
const client = new Client({ name: 'kerf-acceptance', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath, args: [join(root, 'packages/mcp/server.mjs')],
  env: { ...process.env, KERF_OUTPUT_DIR: output }, stderr: 'inherit'
});
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
  const call = args => client.callTool({ name: 'create_pdf', arguments: args }, undefined, { timeout: 190_000 });
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
    assert(text.embeddedFonts.some(font => font.includes('KerfSansSC')));
    if (sample.input.paper_size === 'A5') {
      const info = execFileSync('pdfinfo', [path], { encoding: 'utf8' });
      assert.match(info, /Page size:\s+(?:419|420)(?:\.\d+)? x 59[45](?:\.\d+)? pts/u);
    }
    execFileSync('pdftoppm', ['-r', '100', '-png', path, path.slice(0, -4)]);
    console.log('MCP 验收通过', sample.name, pages + ' 页', path);
  }
  assert((await call({ markdown: '![图片](https://example.com/trial.png)', filename: 'external' })).isError);
  assert((await call({ markdown: '文', html: '<p>文</p>', filename: 'wrong' })).isError);
  assert((await call({ markdown: '文', filename: '../bad' })).isError);
} finally {
  await client.close();
  await browser?.close();
}
