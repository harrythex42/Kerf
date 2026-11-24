import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const yes = value => value ? '是' : '否';
const list = numbers => numbers.length ? numbers.join('、') : '无';
const med = numbers => [...numbers].sort((a, b) => a - b).at(Math.floor(numbers.length / 2));
const kb = bytes => (bytes / 1024).toFixed(1);
const esc = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const pathFor = s => s.split('/').map(encodeURIComponent).join('/');

export async function writeReport(dir, result, partial) {
  const suffix = partial ? '-partial' : '';
  const { browser, rows, errorRows, measurements } = result;
  const lines = [
    '# Unsliced 网页可行性测试：自动检查', '',
    `浏览器版本 ${browser}（无界面）。[查看逐页图片](images${suffix}.html) · [详细原始结果](metrics${suffix}.json)`, '',
    '断点对照 MCP 排版：逐页比较第一个块，长表续页还比较第一数据行。'
    + '文字核对忽略空白、不合并形似字；在每个有候选搜索词的页面至少实际搜索一个词。'
    + '主检查把页眉页脚关闭。每页文字与对应预览另行比对。', '',
    '| 样例 / PDF | 字体 | 断点同 MCP | 页数同预览（预览 → PDF） | 空白页 | 原文和搜索均正确 | 预览 / 打印样式尺寸相同 | PDF 每页文字同预览 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |'
  ];
  const gallery = ['<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Unsliced 逐页检查</title>',
    '<style>body{font:16px system-ui;background:#eef1f3;margin:16px}section{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}figure{margin:0}img{width:100%}</style>',
    '<h1>Unsliced · 网页版与 MCP 逐页检查</h1>'];
  for (const row of rows) {
    for (const mode of ['A', 'B']) {
      const cell = row[mode];
      if (!cell) {
        lines.push(`| ${row.name} | ${mode} | 未完成 | — | — | — | — | — |`);
        continue;
      }
      const pdf = pathFor(`${row.slug}/${mode}/document.pdf`);
      lines.push(`| [${row.name}](${pdf}) | ${mode} | ${yes(cell.mcpStartsMatch)} | ${yes(cell.pageCountMatch)}（${cell.plan.pageCount} → ${cell.pdf.pages}） | ${list(cell.pdf.blank)} | ${yes(cell.textCorrect)} | ${yes(cell.previewMatchesPrint)} | ${yes(!cell.pdf.pageTextMismatch.length)} |`);
    }
    const columns = [
      ['A · 系统字体', 'A', /^page-\d+\.png$/u],
      ['B · 按需字体', 'B', /^page-\d+\.png$/u],
      ['MCP · 全局最优', 'mcp', /^optimal-\d+\.png$/u],
      ['MCP · 贪心', 'mcp', /^greedy-scored-\d+\.png$/u]
    ];
    const images = await Promise.all(columns.map(async ([title, subdir, pattern]) =>
      ({ title, subdir, files: (await readdir(join(dir, row.slug, subdir)).catch(() => [])).filter(file => pattern.test(file))
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) })));
    gallery.push(`<h2>${esc(row.name)}</h2>`);
    for (let n = 0; n < Math.max(...images.map(c => c.files.length)); n++) {
      gallery.push('<section>' + images.map(({ title, subdir, files }) => {
        const path = files[n] && pathFor(`${row.slug}/${subdir}/${files[n]}`);
        return `<figure><figcaption>${title} · 第 ${n + 1} 页</figcaption>` +
          (path ? `<a href="${path}"><img loading="lazy" alt="${title} 第 ${n + 1} 页" src="${path}"></a>` : '本版无此页') + '</figure>';
      }).join('') + '</section>');
    }
  }
  lines.push('', '## 字体下载与等待', '', '三次独立空缓存、本机静态地址。时间为正文触发字体加载到字体就绪的中位数，含字体样式请求，不含分页；不代表外网或手机。大小不含传输协议开销。', '',
    '| 文档 | 字体 | 字体文件数 | 字体 KiB | 字体样式 KiB | 等待毫秒（中位数；三次） |',
    '| --- | --- | ---: | ---: | ---: | --- |');
  for (const [name, pair] of Object.entries(measurements)) {
    for (const [font, runs] of Object.entries(pair)) {
      const ms = runs.map(run => Math.round(run.readyMs));
      lines.push(`| ${name} | ${font} | ${med(runs.map(run => run.files))} | ${kb(med(runs.map(run => run.bytes)))} | ${kb(med(runs.map(run => run.cssBytes)))} | ${med(ms)}；${ms.join(' / ')} |`);
    }
  }
  const forced = rows.find(row => row.B?.headerProbe !== undefined)?.B.headerProbe;
  if (forced !== undefined) lines.push('', `另做强制开页眉页脚的检查：PDF 中出现探针文字：**${yes(forced)}**。这不是实际打印对话框的测试。`);
  lines.push('', '## 同一份 MCP 输入：贪心与全局最优', '',
    '留白按可用正文高度计算；表格按完整行切分单列，不算意外切块。', '',
    '| 样例 | 分页 | 计划页数 | 逐页留白 | 意外切块 | 表格续页 | 页底标题 |',
    '| --- | --- | ---: | --- | ---: | ---: | ---: |');
  for (const row of rows) {
    for (const [name, plan] of [['贪心', row.greedy], ['全局最优', row.optimal]]) {
      lines.push(`| ${row.name} | ${name} | ${plan.pageCount} | ${plan.whitespace.map(n => n + '%').join('、')} | ${plan.unwantedSplits} | ${plan.tableCuts} | ${plan.danglingHeadings} |`);
    }
  }
  lines.push('', '## 差异摘要', '');
  for (const e of errorRows) lines.push(`- ${e.name} ${e.mode ?? ''}：${e.error}`);
  for (const row of rows) {
    for (const mode of ['A', 'B']) {
      const r = row[mode];
      if (!r) continue;
      if (!r.mcpStartsMatch) lines.push(`- ${row.name} ${mode}：断点不同，详见原始结果中的 starts。`);
      if (r.text.differences.length) lines.push(`- ${row.name} ${mode}：${r.text.differences.length} 处文字差异。例：${r.text.differences[0]}`);
      if (r.layoutWarnings.length) lines.push(`- ${row.name} ${mode}：${r.layoutWarnings.join('；')}`);
      if (!r.imageCountsMatch || r.pdf.nonA4.length) lines.push(`- ${row.name} ${mode}：图片数量同预览：${yes(r.imageCountsMatch)}；非 A4 页：${list(r.pdf.nonA4)}。`);
    }
  }
  await Promise.all([
    writeFile(join(dir, `report${suffix}.md`), lines.join('\n') + '\n'),
    writeFile(join(dir, `images${suffix}.html`), gallery.join('\n') + '\n')
  ]);
}
