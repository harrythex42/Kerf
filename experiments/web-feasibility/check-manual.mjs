import { execFileSync } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../output/web-feasibility');
const [browser, font, sample, count] = process.argv.slice(2);
if (!/^(safari|firefox|chrome)$/u.test(browser ?? '') || !/^[AB]$/u.test(font ?? '') ||
    !/^[\w-]+\.(html|md)$/u.test(sample ?? '') || !/^[1-9]\d*$/u.test(count ?? '')) {
  throw new Error('用法：node experiments/web-feasibility/check-manual.mjs safari B web-02-table.md 网页上显示的页数');
}
const python = process.env.UNSLICED_PYTHON || 'python3';
const slug = sample.replace(/\.(md|html)$/u, '-$1');
const folder = join(out, 'manual');
const key = `${browser}-${font}-${slug}`;
const pdf = join(folder, `${key}.pdf`);
const imageDir = join(folder, key);
await mkdir(imageDir, { recursive: true });
const reference = join(out, slug, font);
const [pages, text] = await Promise.all(['page-reference.json', 'text-reference.json']
  .map(file => readFile(join(reference, file), 'utf8')));
function inspect(tool, args, input) {
  return JSON.parse(execFileSync(python, [tool, pdf, ...args], { encoding: 'utf8', input }));
}
const physical = inspect(join(here, 'inspect_pdf.py'), [join(imageDir, 'page')], pages);
const original = inspect(join(here, '../../scripts/verify_pdf_text.py'), [], text);
console.log(JSON.stringify({ pdfPages: physical.pages, ownBrowserPreviewPages: +count,
  matchesOwnPreviewCount: physical.pages === +count, blank: physical.blank, nonA4: physical.nonA4,
  // These compare against Chromium; a different pagination in Safari/Firefox
  // can also move continuation headers, not necessarily lose text.
  chromiumReference: { pageTextMismatch: physical.pageTextMismatch, textDifferences: original.differences }
}, null, 2));
