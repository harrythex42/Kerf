import {
  type BreakFlowConfig,
  type PaginationResult,
  type PaginationMetrics,
  type PaginationStrategy,
  resolveConfig,
  OptimalStrategy,
  GreedyScoredStrategy
} from '@breakflow/core';
import { createIsolatedSandbox } from '../sandbox/iframe-sandbox.js';
import { measurePageDimensions } from '../measurement/page-measurer.js';
import { buildLayoutTree } from '../measurement/layout-builder.js';
import { constructPaginatedDOM } from '../dom/dom-paginator.js';
import { attachDebugOverlay } from '../debug/debug-overlay.js';
import { generatePrintStyles } from '../styles/print-styles.js';

export interface PaginateOptions {
  /**
   * If true, replaces original element in-place with paginated DOM container.
   * Default: false (original DOM is never modified).
   */
  replaceOriginal?: boolean;

  /**
   * Inject BreakFlow print media stylesheet into document.head.
   * Default: true
   */
  injectStyles?: boolean;
}

export interface BrowserPaginationResult extends PaginationResult {
  /** The paginated DOM element container */
  element: HTMLElement;
  /** Normalized print CSS stylesheet text */
  styles: string;
}

export interface BrowserPaginatorConfig extends BreakFlowConfig {
  strategy?: PaginationStrategy | 'greedy-scored' | 'optimal';
}

function measureLineHeight(root: HTMLElement): number {
  // Prefer prose over short captions and metadata when the document has both.
  const paragraphs = Array.from(root.querySelectorAll('p')).filter(p => p.getClientRects().length);
  const paragraph = paragraphs.reduce<HTMLElement | undefined>((longest, p) =>
    !longest || p.innerText.length > longest.innerText.length ? p : longest, undefined) ?? root;
  const style = root.ownerDocument.defaultView!.getComputedStyle(paragraph);
  const explicit = parseFloat(style.lineHeight);
  if (explicit > 0) return explicit;
  const probe = root.ownerDocument.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';
  probe.style.font = style.font;
  paragraph.appendChild(probe);
  probe.textContent = 'M';
  const single = probe.offsetHeight;
  probe.textContent = 'M\nM';
  const height = probe.offsetHeight - single;
  probe.remove();
  return height || single;
}

export class BrowserPaginator {
  private readonly config;
  private readonly strategy;

  constructor({ strategy, ...config }: BrowserPaginatorConfig = {}) {
    this.config = resolveConfig(config);
    this.strategy = strategy === 'optimal' ? new OptimalStrategy(config.optimal) :
      typeof strategy === 'object' ? strategy : new GreedyScoredStrategy();
  }

  private resolveTargetElement(target: string | HTMLElement): HTMLElement {
    if (typeof target === 'string') {
      const el = document.querySelector<HTMLElement>(target);
      if (!el) {
        throw new Error(`[BreakFlow] Element not found for selector: "${target}"`);
      }
      return el;
    }
    return target;
  }

  /**
   * Analyze pagination issues and layout metrics WITHOUT modifying the live DOM.
   */
  public async analyze(target: string | HTMLElement): Promise<PaginationResult> {
    const startTime = performance.now();
    const sourceEl = this.resolveTargetElement(target);

    // 1. Prepare isolated sandbox
    const prepStart = performance.now();
    const sandbox = await createIsolatedSandbox(sourceEl, this.config.page);
    const preparationMs = performance.now() - prepStart;

    try {
      // 2. Measure page and layout
      const measureStart = performance.now();
      const pageDims = measurePageDimensions(sandbox.doc, this.config.page);
      const clonedRoot = sandbox.container.firstElementChild as HTMLElement || sandbox.container;
      const nodes = buildLayoutTree(clonedRoot, this.config);
      const measurementMs = performance.now() - measureStart;

      // 3. Planning
      const planStart = performance.now();
      const lineHeightPx = measureLineHeight(clonedRoot);
      const plan = this.strategy.paginate({
        nodes,
        lineHeightPx,
        pageContentHeight: pageDims.contentHeightPx,
        pageContentWidth: pageDims.contentWidthPx,
        config: this.config
      });
      const planningMs = performance.now() - planStart;

      const totalMs = performance.now() - startTime;

      const metrics: PaginationMetrics = {
        lineHeightPx,
        preparationMs,
        measurementMs,
        planningMs,
        renderingMs: 0,
        totalMs,
        measuredNodes: nodes.length,
        pages: plan.pages.length
      };

      return {
        pageCount: plan.pages.length,
        pages: plan.pages,
        issues: plan.issues,
        fixes: plan.fixes,
        metrics
      };
    } finally {
      sandbox.cleanup();
    }
  }

  /**
   * Intelligently paginate the target element into printable pages.
   */
  public async paginate(
    target: string | HTMLElement,
    options: PaginateOptions = {}
  ): Promise<BrowserPaginationResult> {
    const startTime = performance.now();
    const sourceEl = this.resolveTargetElement(target);

    // 1. Prepare isolated sandbox
    const prepStart = performance.now();
    const sandbox = await createIsolatedSandbox(sourceEl, this.config.page);
    const preparationMs = performance.now() - prepStart;

    try {
      // 2. Measure
      const measureStart = performance.now();
      const pageDims = measurePageDimensions(sandbox.doc, this.config.page);
      const clonedRoot = (sandbox.container.firstElementChild as HTMLElement) || sandbox.container;
      const nodes = buildLayoutTree(clonedRoot, this.config);
      const measurementMs = performance.now() - measureStart;

      // 3. Plan
      const planStart = performance.now();
      const lineHeightPx = measureLineHeight(clonedRoot);
      const plan = this.strategy.paginate({
        nodes,
        lineHeightPx,
        pageContentHeight: pageDims.contentHeightPx,
        pageContentWidth: pageDims.contentWidthPx,
        config: this.config
      });
      const planningMs = performance.now() - planStart;

      // 4. Construct Paginated DOM
      const renderStart = performance.now();
      const targetDoc = sourceEl.ownerDocument || document;
      const paginatedRoot = constructPaginatedDOM(
        clonedRoot,
        plan,
        this.config.page,
        targetDoc
      );

      const printStyles = generatePrintStyles(this.config.page);

      if (options.injectStyles !== false) {
        if (!targetDoc.getElementById('breakflow-print-styles')) {
          const styleTag = targetDoc.createElement('style');
          styleTag.id = 'breakflow-print-styles';
          styleTag.textContent = printStyles;
          targetDoc.head.appendChild(styleTag);
        }
      }

      const renderingMs = performance.now() - renderStart;
      const totalMs = performance.now() - startTime;

      const metrics: PaginationMetrics = {
        lineHeightPx,
        preparationMs,
        measurementMs,
        planningMs,
        renderingMs,
        totalMs,
        measuredNodes: nodes.length,
        pages: plan.pages.length
      };

      const result: BrowserPaginationResult = {
        pageCount: plan.pages.length,
        pages: plan.pages,
        issues: plan.issues,
        fixes: plan.fixes,
        metrics,
        element: paginatedRoot,
        styles: printStyles
      };

      // 5. Debug overlay if enabled
      if (this.config.debug) {
        attachDebugOverlay(paginatedRoot, result, targetDoc);
      }

      // 6. Optional in-place replacement
      if (options.replaceOriginal && sourceEl.parentNode) {
        if (sourceEl === targetDoc.body) {
          sourceEl.replaceChildren(paginatedRoot);
        } else {
          sourceEl.parentNode.replaceChild(paginatedRoot, sourceEl);
        }
      }

      return result;
    } finally {
      sandbox.cleanup();
    }
  }
}

export function createPaginator(config?: BrowserPaginatorConfig): BrowserPaginator {
  return new BrowserPaginator(config);
}
