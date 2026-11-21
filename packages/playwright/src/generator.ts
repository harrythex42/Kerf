import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { chromium, type Browser, type Page, type Route } from 'playwright';
import {
  type BreakFlowConfig,
  type PaginationResult,
  type PaginationStrategy,
  resolveConfig,
  RendererError
} from '@breakflow/core';
import type { AnalyzePdfOptions, BrowserStrategyOption, GeneratePdfOptions, PdfResult } from './types.js';

let cachedBundleScript: string | null = null;

function getBrowserBundleScript(): string {
  if (cachedBundleScript) return cachedBundleScript;

  // Resolve path to @breakflow/browser/dist/index.global.js
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(currentDir, "index.global.js"),
    path.resolve(currentDir, '../../browser/dist/index.global.js'),
    path.resolve(currentDir, '../node_modules/@breakflow/browser/dist/index.global.js'),
    path.resolve(currentDir, '../../../node_modules/@breakflow/browser/dist/index.global.js')
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      cachedBundleScript = fs.readFileSync(candidate, 'utf8');
      return cachedBundleScript;
    }
  }

  throw new RendererError(
    'BreakFlow browser bundle (index.global.js) could not be located. Ensure @breakflow/browser is built.'
  );
}

const FONT_URL = 'https://breakflow.invalid/fonts/KerfSansSC.ttf';
const FONT_PATH = fileURLToPath(new URL('../assets/fonts/KerfSansSC.ttf', import.meta.url));

async function serveBundledFont(route: Route): Promise<void> {
  await route.fulfill({
    path: FONT_PATH,
    contentType: 'font/ttf',
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

async function withPreparedPage<T>(
  options: AnalyzePdfOptions & { headless?: boolean },
  run: (page: Page) => Promise<T>
): Promise<T> {
  if (!options.url && !options.html) {
    throw new RendererError('Either "url" or "html" must be provided.');
  }

  let browser: Browser | undefined;
  let page = options.playwrightPage;
  let fontRouteInstalled = false;
  try {
    if (!page) {
      browser = await chromium.launch({ headless: options.headless ?? true });
      page = await browser.newPage();
    }

    if (options.url) {
      await page.goto(options.url, { waitUntil: 'networkidle' });
    } else {
      await page.setContent(options.html!, { waitUntil: 'networkidle' });
    }

    await page.emulateMedia({ media: 'print' });
    const bodyFont = await page.evaluate(selector => {
      const root = document.querySelector<HTMLElement>(selector);
      if (!root || !/\p{Script=Han}/u.test(root.innerText)) return null;
      root.setAttribute('data-breakflow-cjk-root', '');
      const font = getComputedStyle(root).fontFamily;
      root.style.setProperty('font-family', '"Kerf Sans SC", ' + font, 'important');
      return font;
    }, options.selector ?? 'body');
    if (bodyFont) {
      await page.route(FONT_URL, serveBundledFont);
      fontRouteInstalled = true;
      await page.addStyleTag({ content: `
        @font-face {
          font-family: "Kerf Sans SC";
          src: url("${FONT_URL}") format("truetype");
          font-weight: 400;
          unicode-range: U+2E80-2FFF, U+3000-303F, U+31C0-31EF, U+3400-4DBF,
            U+4E00-9FFF, U+F900-FAFF, U+FE30-FE4F, U+FF00-FFEF, U+20000-323AF;
        }
        body, [data-breakflow-cjk-root] { font-family: "Kerf Sans SC", ${bodyFont} !important; }
      ` });
      await page.evaluate(async () => {
        const faces = await document.fonts.load('400 16px "Kerf Sans SC"', '中');
        if (!faces.length) throw new Error('[BreakFlow] The bundled Kerf Sans SC font did not load.');
      });
    }
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const settleTimeoutMs = options.settleTimeoutMs ?? 200;
    if (settleTimeoutMs > 0) {
      await page.waitForTimeout(settleTimeoutMs);
    }
    await page.addScriptTag({ content: getBrowserBundleScript() });

    return await run(page);
  } finally {
    if (fontRouteInstalled) {
      await page!.unroute(FONT_URL, serveBundledFont);
    }
    if (browser) {
      await browser.close();
    }
  }
}

async function runPagination(
  page: Page,
  selector: string,
  config: BreakFlowConfig | undefined,
  strategy: BrowserStrategyOption | undefined,
  mode: 'analyze' | 'paginate'
): Promise<PaginationResult> {
  let globalName: string | undefined;
  if (typeof strategy === 'object') {
    globalName = strategy.globalName;
    await page.addScriptTag({ content: strategy.script });
  }

  return page.evaluate(async ({ selector, config, globalName, mode, builtin }) => {
    const globals = window as unknown as Record<string, unknown>;
    const breakFlow = globals.BreakFlow as typeof import('@breakflow/browser') | undefined;
    if (!breakFlow?.createPaginator) {
      throw new Error('[BreakFlow] Failed to load BreakFlow engine into browser context.');
    }

    const strategy = globalName === undefined ? undefined : globals[globalName] as PaginationStrategy | undefined;
    if (globalName !== undefined && (typeof strategy?.name !== 'string' || typeof strategy.paginate !== 'function')) {
      throw new Error(`[BreakFlow] Invalid pagination strategy on window.${globalName}.`);
    }

    const paginator = breakFlow.createPaginator({ ...config, strategy: strategy ?? builtin });
    const { pageCount, pages, issues, fixes, metrics } = mode === 'analyze'
      ? await paginator.analyze(selector)
      : await paginator.paginate(selector, { replaceOriginal: true, injectStyles: true });
    return { pageCount, pages, issues, fixes, metrics };
  }, { selector, config, globalName, mode, builtin: typeof strategy === "string" ? strategy : undefined });
}

export async function generatePdf(options: GeneratePdfOptions): Promise<PdfResult> {
  const { selector = 'body', output } = options;
  const config = { ...options.config, page: options.page ?? options.config?.page };
  const resolved = resolveConfig(config);

  return withPreparedPage(options, async page => {
    const result = await runPagination(page, selector, config, options.strategy, 'paginate');
    const pdfBuffer = await page.pdf({
      path: output,
      format: resolved.page.format ?? 'A4',
      preferCSSPageSize: true,
      printBackground: true,
      margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
    });
    return { pdfBuffer: Buffer.from(pdfBuffer), outputPath: output, result };
  });
}

export async function analyzePdf(options: AnalyzePdfOptions): Promise<PaginationResult> {
  return withPreparedPage(options, page =>
    runPagination(page, options.selector ?? 'body', options.config, options.strategy, 'analyze')
  );
}
