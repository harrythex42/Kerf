import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

export const categories = ['报告', '发票', '长表格', '多图', '标题密集', '混合资料'];
const catalog = {
  'balanced-sections.html': ['报告'], 'block-limit.html': ['混合资料', '#report'],
  'breakflow-report-zh.html': ['报告', '#community-report'], 'invoice.html': ['发票', '#invoice-container'],
  'layout-stress.html': ['多图'], 'northline-quarterly.html': ['报告', '[data-unsliced-root]'],
  'alder-launch-retrospective.html': ['报告', '[data-unsliced-root]'],
  'bracken-device-guide.html': ['混合资料', '[data-unsliced-root]'],
  'harborlight-service-review.html': ['报告', '[data-unsliced-root]'],
  'cedarway-readiness-report.html': ['报告', '[data-unsliced-root]'],
  'root-font-size.html': ['混合资料', '#report'], 'root-text.html': ['混合资料', '#report'],
  'table-heading.html': ['标题密集'], 'table-long.html': ['长表格'], 'table-medium.html': ['长表格'],
  'table-multiline.html': ['长表格'], 'table-small.html': ['发票']
};

function random(seed) {
  return limit => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return Math.floor(seed / 2 ** 32 * limit);
  };
}

const topics = ['河岸监测', '社区阅读', '设备巡检', '展览归档', '校园植物', '公共空间'];
const descriptors = ['北侧记录点', '南侧记录点', '河岸步道', '访客中心', '资料仓库', '多功能厅'];
const sentences = [
  '工作人员核对了记录与原始照片，并为随后到场的同事标明了复测位置。',
  '本轮记录沿用上期口径，每项读数都保留原单位并附上现场备注。',
  '遇到现场条件变化时，负责人先登记原因，再安排一次独立复核。',
  '此项已纳入下一轮工作清单，交接时需要核对材料是否齐全。',
  '读数由两人分别填写，随后按日期和地点归档，供下次巡查时比对。',
  '记录组在现场补拍了细节，整理后的材料可以在例会前统一查看。'
];

function htmlFor(index, category, seed, diagrams) {
  const next = random(seed);
  const title = topics[next(topics.length)] + ' · ' + (category === '发票' ? '服务发票' : category);
  const prose = n => Array.from({ length: n }, () => sentences[next(sentences.length)]).join('');
  const table = n => '<table><thead><tr><th>序号</th><th>项目</th><th>数量</th><th>核对备注</th></tr></thead><tbody>' +
    Array.from({ length: n }, (_, i) => `<tr><td>${i + 1}</td><td>${descriptors[next(descriptors.length)]}</td><td>${next(82) + 1}</td><td>${i % 5 === 0 ? '复核完成，等待归档。' : '已核对'}</td></tr>`).join('') +
    '</tbody></table>';
  const receiptRows = category === '发票' ? Array.from({ length: 20 + next(12) }, () => {
    const count = 1 + next(6), price = 30 + next(230);
    const name = descriptors[next(descriptors.length)];
    return { count, price, name };
  }) : [];
  const receipt = receiptRows.length ? '<p>账单编号 U-' + (100 + index) + ' · 付款方为现场服务中心。</p>' +
    '<table><thead><tr><th>收费项目</th><th>数量</th><th>单价</th><th>小计</th></tr></thead><tbody>' +
    receiptRows.map(({ name, count, price }) => `<tr><td>${name}技术服务</td><td>${count}</td><td>${price} 元</td><td>${count * price} 元</td></tr>`).join('') +
    '</tbody></table><p>应付合计 ' + receiptRows.reduce((sum, row) => sum + row.count * row.price, 0) + ' 元。</p>' : '';
  const figure = i => {
    const height = 105 + next(160);
    const graphic = diagrams[Math.floor(i / 2) % diagrams.length].replace('<svg ', `<svg style="height:${height}px" `);
    return `<figure>${graphic}<figcaption>现场图 ${i + 1} · ${descriptors[next(descriptors.length)]}</figcaption></figure>`;
  };
  const sections = receipt ? receipt + '<h2>账单说明</h2><p>' + prose(12) + '</p>' : Array.from({ length: 12 + next(7) }, (_, i) => {
    const heading = category === '标题密集' || i % 2 === 0
      ? `<h2>${i + 1}. ${descriptors[next(descriptors.length)]}</h2>` : '';
    const paragraphs = `<p>${prose(category === '标题密集' ? 2 + next(8) : 4 + next(18))}</p>`;
    let extra = '';
    if (category === '长表格' && [1, 5, 8].includes(i)) extra = table(24 + next(36));
    if (category === '多图' && i % 2 === 0) extra = figure(i);
    if (category === '混合资料' && i % 3 === 0) extra = i % 2 ? figure(i) : table(8 + next(14));
    return heading + paragraphs + extra;
  }).join('');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${title}</title>
<style>
body { color: #26333a; font: 15px/1.55 system-ui, sans-serif; }
header { border-top: 4px solid #32756b; padding: 12px 0 4px; margin-bottom: 14px; }
h1 { margin: 0 0 6px; font-size: 26px; } h2 { font-size: 18px; color: #29665d; margin: 16px 0 6px; }
p { margin: 0 0 12px; } table { border-collapse: collapse; width: 100%; margin: 0 0 12px; }
th,td { padding: 4px 9px; border-bottom: 1px solid #d7e2e1; text-align: left; } th { background: #e6f0ec; }
figure { margin: 0 0 12px; padding: 10px; background: #f0f5f4; } figure svg { display: block; width: 100%; }
figcaption { margin-top: 7px; }
</style><main data-unsliced-root><header><h1>${title}</h1><p>记录编号 ${100 + index} · ${descriptors[next(descriptors.length)]}</p></header>${sections}</main></html>`;
}

async function listFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await listFiles(join(directory, entry.name), name + '/'));
    else if (entry.isFile()) result.push(name);
  }
  return result.sort();
}

export async function prepareDocuments(project, archive) {
  await mkdir(archive, { recursive: true });
  await cp(join(project, 'samples'), join(archive, 'samples'), { recursive: true });
  const sampleFiles = await listFiles(join(archive, 'samples'));
  const docs = sampleFiles.filter(name => name.endsWith('.html')).map(name => ({
    path: 'samples/' + name, source: 'sample',
    category: catalog[name]?.[0] ?? '混合资料', selector: catalog[name]?.[1]
  }));
  const generated = join(archive, 'generated');
  await mkdir(generated, { recursive: true });
  const generatedCount = Math.max(0, 30 - docs.length);
  const diagrams = await Promise.all(['river.svg', 'hill.svg'].map(name =>
    readFile(join(archive, 'samples', 'figures', name), 'utf8')));
  for (let index = 0; index < generatedCount; index++) {
    const seed = 638704 + index * 739;
    const category = categories[index % categories.length];
    const name = `generated-${String(index + 1).padStart(2, '0')}.html`;
    await writeFile(join(generated, name), htmlFor(index, category, seed, diagrams));
    docs.push({ path: 'generated/' + name, source: 'generated', category, seed, selector: '[data-unsliced-root]' });
  }
  const assets = await Promise.all(sampleFiles.filter(name => !name.endsWith('.html')).map(async name =>
    [name, digest(await readFile(join(archive, 'samples', name)))]));
  for (const doc of docs) {
    doc.sha256 = digest(await readFile(join(archive, doc.path)));
    doc.id = digest(JSON.stringify([doc.path, doc.sha256, assets])).slice(0, 20);
  }
  return docs;
}
