// Run pnpm acceptance and pnpm acceptance --letter-demo first. Then install jspdf@4.2.0
// into output/readme-comparison/tools and run this script with the same UNSLICED_PYTHON.
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'output', 'readme-comparison');
const python = process.env.UNSLICED_PYTHON || 'python3';
const { jsPDF } = createRequire(join(output, 'tools', 'package.json'))('jspdf');
const names = ['northline-quarterly', 'alder-launch-retrospective', 'bracken-device-guide',
  'harborlight-service-review', 'cedarway-readiness-report'];
const acceptance = JSON.parse(await readFile(join(root, 'output/acceptance/metrics.json'), 'utf8'));
const letterDemo = JSON.parse(await readFile(join(root, 'output/acceptance-letter-demo/metrics.json'), 'utf8'));
if (acceptance.paper !== 'A4' || letterDemo.paper !== 'Letter') {
  throw new Error('Run both pnpm acceptance and pnpm acceptance --letter-demo before comparing.');
}
const px = mm => Math.round(mm * 96 / 25.4);
const measureBlank = pdf => JSON.parse(execFileSync(python,
  [join(root, 'scripts/measure_pdf_blank.py'), pdf], { encoding: 'utf8' }));
const emptiest = whitespace => whitespace.length > 1 ? Math.max(...whitespace.slice(0, -1)) : null;
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const asset = (from, to) => relative(from, to).split(sep).map(encodeURIComponent).join('/');
const html = body => `<!doctype html><html lang="en"><meta charset="utf-8"><title>Unsliced comparison</title>
<style>body{margin:0;background:#ecf2f4;color:#183845;font:16px/1.45 system-ui}
.sheet{padding:22px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
article{padding:10px;background:#f6f9fa;border:1px solid #b7c9ce;align-self:start}
h1,h2,p{margin:0 0 10px}h2{font-size:22px}figure{margin:0 0 8px}figcaption{font-size:14px}
img{display:block;width:100%;height:auto;border:1px solid #c3d1d6;box-sizing:border-box}
.stats{padding:12px;background:#dbe9e9;font-size:16px;font-weight:600}</style>${body}</html>`;

function renderPages(pdf, directory, dpi) {
  execFileSync(python, [join(root, 'scripts/render_pdf_pages.py'), pdf, join(directory, 'page'), String(dpi)]);
}

async function rasterBaseline(page, name, directory, paper, dpi = 120) {
  const [innerWidth, innerHeight] = paper === 'Letter' ? [185.9, 249.4] : [180, 267];
  const width = px(innerWidth), height = px(innerHeight);
  const source = join(root, 'samples', name + '.html');
  const css = await readFile(join(dirname(source), 'editorial-reports.css'), 'utf8');
  const document = (await readFile(source, 'utf8'))
    .replace('<link rel="stylesheet" href="editorial-reports.css">', `<style>${css}</style>`);
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ media: 'print' });
  await page.setContent(document);
  const measured = await page.locator('main').evaluate(main => {
    const boxes = [...main.querySelectorAll(':scope > :not(table), :scope > table tr')].map(node => {
      const { top, bottom } = node.getBoundingClientRect();
      return { top, bottom, tag: node.tagName.toLowerCase(), heading: /^H[1-6]$/.test(node.tagName) };
    });
    return { title: document.title, boxes, extent: Math.ceil(Math.max(...boxes.map(box => box.bottom))) };
  });
  const pageCount = Math.ceil(measured.extent / height);
  const pdf = new jsPDF({ format: paper.toLowerCase(), unit: 'mm', compress: true });
  const cut = new Set();
  let orphans = 0;
  for (let index = 0; index < pageCount; index++) {
    const start = index * height, end = start + height;
    const visible = measured.boxes.filter(box => box.top < end && box.bottom > start);
    const last = visible.at(-1);
    if (index + 1 < pageCount && last?.heading && last.bottom <= end) orphans++;
    for (const box of visible) if (box.bottom > end + 0.05) cut.add(box);
    const crop = Math.min(height, measured.extent - start);
    await page.evaluate(offset => { document.body.style.transform = `translateY(-${offset}px)`; }, start);
    const image = await page.screenshot({ clip: { x: 0, y: 0, width, height: crop } });
    if (index) pdf.addPage();
    pdf.addImage(image, 'PNG', 15, 15, innerWidth, innerHeight * crop / height, undefined, 'FAST');
  }
  await mkdir(directory, { recursive: true });
  const pdfPath = join(directory, 'document.pdf');
  await writeFile(pdfPath, Buffer.from(pdf.output('arraybuffer')));
  renderPages(pdfPath, directory, dpi);
  return { title: measured.title, label: 'jsPDF · fixed slices', pages: pageCount,
    splits: cut.size, cutTags: [...cut].map(box => box.tag), orphans, whitespace: measureBlank(pdfPath), directory,
    images: Array.from({ length: pageCount }, (_, i) =>
      `page-${String(i + 1).padStart(String(pageCount).length, '0')}.png`) };
}

const browser = await chromium.launch(process.env.UNSLICED_CHROMIUM
  ? { executablePath: process.env.UNSLICED_CHROMIUM } : {});
try {
  const baseline = await browser.newPage();
  const render = await browser.newPage({ viewport: { width: 1350, height: 900 }, deviceScaleFactor: 1 });
  const reports = [];
  for (const name of names) {
    const directory = join(output, name);
    const isLetter = name === 'cedarway-readiness-report';
    const paper = isLetter ? 'Letter' : 'A4';
    const sliced = await rasterBaseline(baseline, name, join(directory, 'jspdf'), paper);
    const paired = (isLetter ? letterDemo : acceptance).rows.filter(row => row.filename === name + '.html');
    if (paired.length !== 2 || paired.some(row => row.details.length)) throw new Error('Missing or failed acceptance results for ' + name);
    const rows = [sliced];
    for (const row of paired) {
      const dest = join(directory, row.strategy);
      await mkdir(dest, { recursive: true });
      await Promise.all(['document.pdf', ...row.images].map(file => copyFile(join(row.directory, file), join(dest, file))));
      rows.push({ ...row, directory: dest, whitespace: measureBlank(join(dest, 'document.pdf')),
        label: row.strategy === 'optimal' ? 'Unsliced · global optimum' : 'Unsliced · greedy' });
    }
    if (name === 'northline-quarterly') {
      // Capture the raster baseline at 2× rather than enlarging the legacy README panels.
      const highRes = join(directory, 'hi-res');
      const highResBaseline = await browser.newPage({ deviceScaleFactor: 2 });
      try {
        await rasterBaseline(highResBaseline, name, join(highRes, 'jspdf'), paper, 240);
      } finally {
        await highResBaseline.close();
      }
      const highResOptimal = join(highRes, 'optimal');
      await mkdir(highResOptimal, { recursive: true });
      renderPages(join(directory, 'optimal', 'document.pdf'), highResOptimal, 240);
    }
    const page = join(directory, 'index.html');
    const columns = rows.map(row => {
      const link = file => escape(asset(directory, join(row.directory, file)));
      return `<article><h2>${escape(row.label)}</h2><p><a href="${link('document.pdf')}">PDF</a></p>` + row.images.map((name, i) =>
        `<figure><img src="${link(name)}" alt="Page ${i + 1}"><figcaption>Page ${i + 1} · bottom blank ${row.whitespace[i]}%</figcaption></figure>`
      ).join('') + `<p class="stats">${row.pages} pages · ${row.splits} cut blocks · ${row.orphans} bottom headings<br>
      Emptiest non-final page: ${emptiest(row.whitespace) === null ? 'n/a' : `${emptiest(row.whitespace)}% blank`}</p></article>`;
    });
    await writeFile(page, html(`<main class="sheet"><h1>${escape(sliced.title)}</h1>
      <p>${paper === 'Letter' ? 'US Letter' : paper} · 15 mm margins · same source. jsPDF rasterises fixed-height slices, not all jsPDF modes.</p>
      <div class="grid">${columns.join('')}</div></main>`));
    await render.goto(pathToFileURL(page).href);
    await render.locator('.grid img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await render.locator('.sheet').screenshot({ path: join(directory, 'comparison.png') });
    for (const [i, id] of ['jspdf', 'greedy', 'optimal'].entries()) {
      await render.locator('.grid article').nth(i).screenshot({ path: join(directory, `${id}.png`) });
    }
    reports.push({ name, title: sliced.title, paper, rows: rows.map(row => ({
      label: row.label, pages: row.pages, cutBlocks: row.splits, cutTags: row.cutTags, bottomHeadings: row.orphans,
      emptiest: emptiest(row.whitespace),
      whitespace: row.whitespace, acceptanceIssues: row.details ?? []
    })) });
  }
  await writeFile(join(output, 'metrics.json'), JSON.stringify({ browser: browser.version(), reports }, null, 2) + '\n');
  await writeFile(join(output, 'index.html'), html('<main class="sheet"><h1>README comparison candidates</h1><ul>' +
    reports.map(report => `<li><a href="${report.name}/index.html">${escape(report.title)}</a> (${report.paper}) · <a href="${report.name}/comparison.png">PNG</a></li>`).join('') +
    '</ul><p>Cut blocks count figures, paragraphs, headings and table rows, not breaks between complete rows. The largest bottom blank excludes page margins and the last page.</p></main>'));
} finally {
  await browser.close();
}
