/*! Generated from Unsliced Core; BreakFlow and Unsliced contributors — MIT. See ../LICENSE. */
"use strict";
var BreakFlow = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    AssetTimeoutError: () => AssetTimeoutError,
    BreakFlowError: () => BreakFlowError,
    BrowserPaginator: () => BrowserPaginator,
    DEFAULT_OPTIMAL_OPTIONS: () => DEFAULT_OPTIMAL_OPTIONS,
    GreedyScoredStrategy: () => GreedyScoredStrategy,
    MeasurementError: () => MeasurementError,
    OptimalStrategy: () => OptimalStrategy,
    PaginationError: () => PaginationError,
    RendererError: () => RendererError,
    STANDARD_PAGE_SIZES: () => STANDARD_PAGE_SIZES,
    ScoringEngine: () => ScoringEngine,
    attachDebugOverlay: () => attachDebugOverlay,
    buildLayoutTree: () => buildLayoutTree,
    constructPaginatedDOM: () => constructPaginatedDOM,
    createIsolatedSandbox: () => createIsolatedSandbox,
    createLogger: () => createLogger,
    createPaginator: () => createPaginator,
    defineConfig: () => defineConfig,
    generatePrintStyles: () => generatePrintStyles,
    inToPx: () => inToPx,
    measurePageDimensions: () => measurePageDimensions,
    mmToPx: () => mmToPx,
    pageCostModel: () => pageCostModel,
    parseLengthToPx: () => parseLengthToPx,
    planTablePagination: () => planTablePagination,
    ptToPx: () => ptToPx,
    pxToMm: () => pxToMm,
    resolveConfig: () => resolveConfig,
    resolvePageConfig: () => resolvePageConfig,
    waitForAssets: () => waitForAssets
  });

  // ../core/dist/index.js
  var STANDARD_PAGE_SIZES = {
    A3: { widthMm: 297, heightMm: 420 },
    A4: { widthMm: 210, heightMm: 297 },
    A5: { widthMm: 148, heightMm: 210 },
    Letter: { widthMm: 215.9, heightMm: 279.4 },
    Legal: { widthMm: 215.9, heightMm: 355.6 },
    Tabloid: { widthMm: 279.4, heightMm: 431.8 }
  };
  function defineConfig(config = {}) {
    return config;
  }
  function normalizeMarginValue(val, defaultVal) {
    if (val === void 0) return defaultVal;
    if (typeof val === "number") return `${val}px`;
    return String(val);
  }
  function resolveMargins(margin) {
    const defaultMargin = "15mm";
    if (!margin) {
      return { top: defaultMargin, right: defaultMargin, bottom: defaultMargin, left: defaultMargin };
    }
    if (typeof margin === "string" || typeof margin === "number") {
      const val = normalizeMarginValue(margin, defaultMargin);
      return { top: val, right: val, bottom: val, left: val };
    }
    return {
      top: normalizeMarginValue(margin.top, defaultMargin),
      right: normalizeMarginValue(margin.right, defaultMargin),
      bottom: normalizeMarginValue(margin.bottom, defaultMargin),
      left: normalizeMarginValue(margin.left, defaultMargin)
    };
  }
  function resolvePageConfig(pageConfig = {}) {
    const format = pageConfig.format ?? (pageConfig.width ? void 0 : "A4");
    const orientation = pageConfig.orientation ?? "portrait";
    const margin = resolveMargins(pageConfig.margin);
    let width;
    let height;
    if (format && STANDARD_PAGE_SIZES[format]) {
      const dims = STANDARD_PAGE_SIZES[format];
      if (orientation === "landscape") {
        width = `${dims.heightMm}mm`;
        height = `${dims.widthMm}mm`;
      } else {
        width = `${dims.widthMm}mm`;
        height = `${dims.heightMm}mm`;
      }
    } else {
      width = pageConfig.width ? typeof pageConfig.width === "number" ? `${pageConfig.width}px` : pageConfig.width : "210mm";
      height = pageConfig.height ? typeof pageConfig.height === "number" ? `${pageConfig.height}px` : pageConfig.height : "297mm";
    }
    return {
      format,
      width,
      height,
      margin,
      orientation
    };
  }
  function resolveConfig(config = {}) {
    const page = resolvePageConfig(config.page);
    const smartDefaults = config.smartDefaults ?? true;
    const defaultKeepTogether = smartDefaults ? ["figure", "pre", "blockquote", '[data-breakflow="keep"]', "[data-breakflow-keep]"] : ['[data-breakflow="keep"]', "[data-breakflow-keep]"];
    const defaultKeepWithNext = smartDefaults ? ["h1", "h2", "h3", "h4", "h5", "h6", '[data-breakflow="keep-next"]', "[data-breakflow-keep-next]"] : ['[data-breakflow="keep-next"]', "[data-breakflow-keep-next]"];
    const defaultBreakBefore = ['[data-breakflow="break-before"]', "[data-breakflow-break-before]"];
    const defaultBreakAfter = ['[data-breakflow="break-after"]', "[data-breakflow-break-after]"];
    const rules = {
      keepTogether: Array.from(/* @__PURE__ */ new Set([...defaultKeepTogether, ...config.rules?.keepTogether ?? []])),
      keepWithNext: Array.from(/* @__PURE__ */ new Set([...defaultKeepWithNext, ...config.rules?.keepWithNext ?? []])),
      breakBefore: Array.from(/* @__PURE__ */ new Set([...defaultBreakBefore, ...config.rules?.breakBefore ?? []])),
      breakAfter: Array.from(/* @__PURE__ */ new Set([...defaultBreakAfter, ...config.rules?.breakAfter ?? []]))
    };
    const table = {
      repeatHeader: config.table?.repeatHeader ?? true,
      preventRowSplit: config.table?.preventRowSplit ?? true
    };
    const penalties = {
      keepTogether: config.penalties?.keepTogether ?? 1e5,
      tableRowSplit: config.penalties?.tableRowSplit ?? 1e5,
      keepWithNext: config.penalties?.keepWithNext ?? 3e4,
      orphanHeading: config.penalties?.orphanHeading ?? 2e4,
      widow: config.penalties?.widow ?? 1e4,
      oversizedElement: config.penalties?.oversizedElement ?? 5e4,
      whitespace: config.penalties?.whitespace ?? 1
    };
    return {
      page,
      smartDefaults,
      rules,
      table,
      penalties,
      maxIterations: config.maxIterations ?? Infinity,
      maxPages: config.maxPages ?? 200,
      logLevel: config.logLevel ?? "warn",
      debug: config.debug ?? false
    };
  }
  var BreakFlowError = class extends Error {
    constructor(message, code = "BREAKFLOW_ERROR") {
      super(`[BreakFlow] ${message}`);
      this.code = code;
      this.name = "BreakFlowError";
      Object.setPrototypeOf(this, new.target.prototype);
    }
    code;
  };
  var MeasurementError = class extends BreakFlowError {
    constructor(message, details) {
      super(message, "MEASUREMENT_ERROR");
      this.details = details;
      this.name = "MeasurementError";
    }
    details;
  };
  var PaginationError = class extends BreakFlowError {
    constructor(message, details) {
      super(message, "PAGINATION_ERROR");
      this.details = details;
      this.name = "PaginationError";
    }
    details;
  };
  var RendererError = class extends BreakFlowError {
    constructor(message, details) {
      super(message, "RENDERER_ERROR");
      this.details = details;
      this.name = "RendererError";
    }
    details;
  };
  var AssetTimeoutError = class extends BreakFlowError {
    constructor(message, timeoutMs) {
      super(`Asset loading timed out after ${timeoutMs}ms: ${message}`, "ASSET_TIMEOUT_ERROR");
      this.timeoutMs = timeoutMs;
      this.name = "AssetTimeoutError";
    }
    timeoutMs;
  };
  var LOG_LEVEL_SEVERITY = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4
  };
  function createLogger(level = "warn", custom) {
    if (custom) return custom;
    const threshold = LOG_LEVEL_SEVERITY[level] ?? 2;
    return {
      debug(msg, ...args) {
        if (threshold >= 4) {
          console.debug(`[BreakFlow:DEBUG] ${msg}`, ...args);
        }
      },
      info(msg, ...args) {
        if (threshold >= 3) {
          console.info(`[BreakFlow:INFO] ${msg}`, ...args);
        }
      },
      warn(msg, ...args) {
        if (threshold >= 2) {
          console.warn(`[BreakFlow:WARN] ${msg}`, ...args);
        }
      },
      error(msg, ...args) {
        if (threshold >= 1) {
          console.error(`[BreakFlow:ERROR] ${msg}`, ...args);
        }
      }
    };
  }
  var ScoringEngine = class {
    constructor(penalties) {
      this.penalties = penalties;
    }
    penalties;
    /**
     * Calculates the penalty flags for a break occurring between or inside nodes.
     */
    evaluatePenaltyFlags(precedingNode, followingNode, remainingSpace, pageContentHeight, isTableRowSplit = false) {
      let orphanHeading = false;
      let keepWithNextViolation = false;
      let keepTogetherViolation = false;
      let widow = false;
      let oversizedElement = false;
      if (precedingNode) {
        const isHeading = precedingNode.type === "heading" || ["h1", "h2", "h3", "h4", "h5", "h6"].includes(precedingNode.tagName.toLowerCase());
        if (precedingNode.rules.keepWithNext || isHeading) {
          keepWithNextViolation = true;
          if (isHeading) {
            orphanHeading = true;
          }
        }
        if (precedingNode.rules.keepTogether && precedingNode.bounds.height > 0) {
          if (precedingNode.bounds.height > pageContentHeight) {
            oversizedElement = true;
          }
        }
      }
      if (remainingSpace > 0 && remainingSpace < pageContentHeight * 0.05) {
        widow = false;
      }
      return {
        orphanHeading,
        widow,
        keepTogetherViolation,
        keepWithNextViolation,
        tableRowSplit: isTableRowSplit,
        oversizedElement
      };
    }
    /**
     * Computes the numeric cost for a break candidate.
     * Lower cost is better. Forced breaks return Number.NEGATIVE_INFINITY.
     */
    calculateBreakCost(candidate) {
      if (candidate.forced) {
        return Number.NEGATIVE_INFINITY;
      }
      let cost = Math.max(0, candidate.remainingSpace) * this.penalties.whitespace;
      if (candidate.penalties.keepTogetherViolation) {
        cost += this.penalties.keepTogether;
      }
      if (candidate.penalties.tableRowSplit) {
        cost += this.penalties.tableRowSplit;
      }
      if (candidate.penalties.keepWithNextViolation) {
        cost += this.penalties.keepWithNext;
      }
      if (candidate.penalties.orphanHeading) {
        cost += this.penalties.orphanHeading;
      }
      if (candidate.penalties.widow) {
        cost += this.penalties.widow;
      }
      if (candidate.penalties.oversizedElement) {
        cost += this.penalties.oversizedElement;
      }
      return cost;
    }
  };
  function planTablePagination(tableNode, availableHeightOnFirstPage, fullPageContentHeight, repeatHeader = true, preventRowSplit = true) {
    const issues = [];
    const fixes = [];
    const slices = [];
    let headerHeight = 0;
    const headerNode = tableNode.children.find((c) => c.type === "table-head" || c.tagName.toLowerCase() === "thead");
    if (headerNode) {
      headerHeight = headerNode.bounds.height;
    }
    const rows = [];
    function collectRows(node) {
      if (node.type === "table-row" || node.tagName.toLowerCase() === "tr") {
        if (!headerNode || !headerNode.children.includes(node)) {
          rows.push(node);
        }
      } else {
        for (const child of node.children) {
          collectRows(child);
        }
      }
    }
    collectRows(tableNode);
    if (rows.length === 0) {
      slices.push({
        startRowIndex: 0,
        endRowIndex: -1,
        repeatsHeader: false,
        headerHeight,
        sliceHeight: tableNode.bounds.height,
        isOversizedRow: false
      });
      return { slices, issues, fixes };
    }
    let currentRowIdx = 0;
    let isFirstSlice = true;
    while (currentRowIdx < rows.length) {
      const availableHeight = isFirstSlice ? availableHeightOnFirstPage : fullPageContentHeight;
      const effectiveHeaderHeight = !isFirstSlice && repeatHeader ? headerHeight : isFirstSlice ? headerHeight : 0;
      const availableForRows = availableHeight - effectiveHeaderHeight;
      let accumulatedHeight = 0;
      let sliceStartIdx = currentRowIdx;
      let sliceEndIdx = currentRowIdx;
      let sliceHasAtLeastOneRow = false;
      while (currentRowIdx < rows.length) {
        const row = rows[currentRowIdx];
        const rowHeight = row.bounds.height;
        if (rowHeight > fullPageContentHeight) {
          issues.push({
            type: "oversized-element",
            severity: "warning",
            selector: row.selector,
            message: `Table row height (${Math.round(rowHeight)}px) exceeds available page height (${Math.round(fullPageContentHeight)}px).`,
            details: { rowHeight, availableHeight: fullPageContentHeight }
          });
        }
        if (accumulatedHeight + rowHeight <= availableForRows || !sliceHasAtLeastOneRow) {
          accumulatedHeight += rowHeight;
          sliceEndIdx = currentRowIdx;
          sliceHasAtLeastOneRow = true;
          currentRowIdx++;
        } else {
          break;
        }
      }
      const repeats = !isFirstSlice && repeatHeader && headerHeight > 0;
      slices.push({
        startRowIndex: sliceStartIdx,
        endRowIndex: sliceEndIdx,
        repeatsHeader: repeats,
        headerHeight: repeats ? headerHeight : 0,
        sliceHeight: accumulatedHeight + (repeats ? headerHeight : isFirstSlice ? headerHeight : 0),
        isOversizedRow: false
      });
      if (repeats) {
        fixes.push({
          type: "split-table-repeat-header",
          selector: tableNode.selector,
          description: `Split table and repeated <thead> on continuation page for rows ${sliceStartIdx + 1}..${sliceEndIdx + 1}`
        });
      }
      isFirstSlice = false;
    }
    return { slices, issues, fixes };
  }
  var GreedyScoredStrategy = class {
    name = "greedy-scored";
    paginate(input) {
      const { nodes, pageContentHeight, config } = input;
      const scoring = new ScoringEngine(config.penalties);
      const pages = [];
      const issues = [];
      const fixes = [];
      let currentPageNumber = 1;
      let currentPageItems = [];
      let currentHeight = 0;
      let iterationCount = 0;
      const finalizePage = (hasForcedBreak = false, isOversizedContinuation = false) => {
        if (currentPageItems.length === 0 && !hasForcedBreak) {
          return;
        }
        if (pages.length >= config.maxPages) {
          throw new PaginationError(`Pagination exceeded the maximum page count (${config.maxPages}).`);
        }
        pages.push({
          pageNumber: currentPageNumber++,
          contentHeight: currentHeight,
          availableHeight: pageContentHeight,
          remainingSpace: Math.max(0, pageContentHeight - currentHeight),
          items: [...currentPageItems],
          hasForcedBreak,
          isOversizedContinuation
        });
        currentPageItems = [];
        currentHeight = 0;
      };
      let i = 0;
      while (i < nodes.length) {
        iterationCount++;
        if (iterationCount > config.maxIterations) {
          throw new PaginationError(`Pagination exceeded maximum iterations (${config.maxIterations}).`);
        }
        const node = nodes[i];
        const nodeHeight = node.bounds.height;
        const nextNode = i + 1 < nodes.length ? nodes[i + 1] : void 0;
        if (node.rules.breakBefore && currentPageItems.length > 0) {
          fixes.push({
            type: "insert-page-break",
            selector: node.selector,
            description: `Applied breakBefore on ${node.selector}`,
            toPage: currentPageNumber + 1
          });
          finalizePage(true);
        }
        const isHeading = node.type === "heading" || ["h1", "h2", "h3", "h4", "h5", "h6"].includes(node.tagName.toLowerCase());
        const needsNext = node.rules.keepWithNext || isHeading;
        if (node.type === "table" || node.tagName.toLowerCase() === "table") {
          const availableHeight = currentPageItems.length === 0 ? pageContentHeight : Math.max(0, pageContentHeight - currentHeight);
          if (nodeHeight <= availableHeight) {
            currentPageItems.push({
              nodeId: node.id,
              selector: node.selector,
              tagName: node.tagName,
              bounds: { ...node.bounds }
            });
            currentHeight += nodeHeight;
            i++;
            continue;
          }
          if (currentPageItems.length > 0 && nodeHeight <= pageContentHeight) {
            fixes.push({
              type: "move-to-next-page",
              selector: node.selector,
              fromPage: currentPageNumber,
              toPage: currentPageNumber + 1,
              description: `Moved table to page ${currentPageNumber + 1} to keep it intact`
            });
            finalizePage(false);
            continue;
          }
          if (currentPageItems.length > 0 && availableHeight < pageContentHeight * 0.25) {
            finalizePage(false);
            continue;
          }
          const tablePlan = planTablePagination(
            node,
            availableHeight,
            pageContentHeight,
            config.table.repeatHeader,
            config.table.preventRowSplit
          );
          issues.push(...tablePlan.issues);
          fixes.push(...tablePlan.fixes);
          for (let s = 0; s < tablePlan.slices.length; s++) {
            const slice = tablePlan.slices[s];
            if (s > 0) {
              finalizePage(false);
            }
            currentPageItems.push({
              nodeId: node.id,
              selector: node.selector,
              tagName: node.tagName,
              bounds: {
                ...node.bounds,
                height: slice.sliceHeight
              },
              isPartial: tablePlan.slices.length > 1,
              tableSplit: {
                isSplit: tablePlan.slices.length > 1,
                startRowIndex: slice.startRowIndex,
                endRowIndex: slice.endRowIndex,
                repeatsHeader: slice.repeatsHeader
              }
            });
            currentHeight += slice.sliceHeight;
          }
          i++;
          continue;
        }
        if (nodeHeight > pageContentHeight) {
          issues.push({
            type: "oversized-element",
            severity: "warning",
            selector: node.selector,
            page: currentPageNumber,
            message: `Element ${node.selector} height (${Math.round(nodeHeight)}px) exceeds page content height (${Math.round(pageContentHeight)}px). Degraded keepTogether.`,
            details: { measuredHeight: nodeHeight, availablePageHeight: pageContentHeight }
          });
          if (currentPageItems.length > 0) {
            finalizePage(false);
          }
          if (node.children.length > 0) {
            fixes.push({
              type: "split-oversized-element",
              selector: node.selector,
              description: `Split oversized element ${node.selector} across pages by children`
            });
            for (const child of node.children) {
              if (currentHeight + child.bounds.height > pageContentHeight && currentPageItems.length > 0) {
                finalizePage(false, true);
              }
              currentPageItems.push({
                nodeId: child.id,
                selector: child.selector,
                tagName: child.tagName,
                bounds: { ...child.bounds }
              });
              currentHeight += child.bounds.height;
            }
          } else {
            currentPageItems.push({
              nodeId: node.id,
              selector: node.selector,
              tagName: node.tagName,
              bounds: { ...node.bounds }
            });
            currentHeight += nodeHeight;
            finalizePage(false);
          }
          i++;
          continue;
        }
        const remainingOnPage = pageContentHeight - currentHeight;
        if (nodeHeight <= remainingOnPage) {
          if (needsNext && nextNode && currentPageItems.length > 0) {
            let nextHeight = nextNode.bounds.height;
            let chainHeight = nextHeight;
            for (let j = i + 1; nodes[j]?.rules.keepWithNext && nodes[j + 1]; j++) {
              chainHeight += nodes[j + 1].bounds.height;
              if (nodes[j + 1].type === "table") {
                nextHeight = chainHeight;
                break;
              }
            }
            const roomForBoth = currentHeight + nodeHeight + nextHeight <= pageContentHeight;
            const nextCanFitOnFreshPage = nextHeight <= pageContentHeight;
            if (!roomForBoth && nextCanFitOnFreshPage) {
              fixes.push({
                type: "prevent-orphan-heading",
                selector: node.selector,
                fromPage: currentPageNumber,
                toPage: currentPageNumber + 1,
                description: `Moved heading ${node.selector} to page ${currentPageNumber + 1} with subsequent content`
              });
              finalizePage(false);
              continue;
            }
          }
          currentPageItems.push({
            nodeId: node.id,
            selector: node.selector,
            tagName: node.tagName,
            bounds: { ...node.bounds }
          });
          currentHeight += nodeHeight;
          if (node.rules.breakAfter) {
            fixes.push({
              type: "insert-page-break",
              selector: node.selector,
              description: `Applied breakAfter on ${node.selector}`,
              toPage: currentPageNumber + 1
            });
            finalizePage(true);
          }
          i++;
        } else {
          if (currentPageItems.length > 0) {
            fixes.push({
              type: "move-to-next-page",
              selector: node.selector,
              fromPage: currentPageNumber,
              toPage: currentPageNumber + 1,
              description: `Moved ${node.selector} to page ${currentPageNumber + 1} to avoid split`
            });
            finalizePage(false);
          } else {
            currentPageItems.push({
              nodeId: node.id,
              selector: node.selector,
              tagName: node.tagName,
              bounds: { ...node.bounds }
            });
            currentHeight += nodeHeight;
            i++;
          }
        }
      }
      finalizePage(false);
      for (let pIdx = 0; pIdx < pages.length; pIdx++) {
        const page = pages[pIdx];
        if (page.contentHeight > page.availableHeight + 2) {
          issues.push({
            type: "overflow",
            severity: "warning",
            page: page.pageNumber,
            message: `Page ${page.pageNumber} content height (${Math.round(page.contentHeight)}px) exceeds available height (${Math.round(page.availableHeight)}px).`
          });
        }
        if (page.items.length > 0) {
          const lastItem = page.items[page.items.length - 1];
          const isHeading = lastItem.tagName.toLowerCase().startsWith("h") && ["h1", "h2", "h3", "h4", "h5", "h6"].includes(lastItem.tagName.toLowerCase());
          if (isHeading && pIdx < pages.length - 1) {
            issues.push({
              type: "orphan-heading",
              severity: "warning",
              page: page.pageNumber,
              selector: lastItem.selector,
              message: `Orphan heading detected at bottom of page ${page.pageNumber}: ${lastItem.selector}`
            });
          }
        }
      }
      return {
        pages,
        issues,
        fixes
      };
    }
  };
  function mmToPx(mm, dpi = 96) {
    return mm * dpi / 25.4;
  }
  function inToPx(inches, dpi = 96) {
    return inches * dpi;
  }
  function ptToPx(pt, dpi = 96) {
    return pt * dpi / 72;
  }
  function pxToMm(px, dpi = 96) {
    return px * 25.4 / dpi;
  }
  function parseLengthToPx(value, defaultVal = 0, dpi = 96) {
    if (value === void 0 || value === null) return defaultVal;
    if (typeof value === "number") return value;
    const str = value.trim().toLowerCase();
    if (str.endsWith("px")) {
      return parseFloat(str) || defaultVal;
    }
    if (str.endsWith("mm")) {
      return mmToPx(parseFloat(str) || 0, dpi);
    }
    if (str.endsWith("cm")) {
      return mmToPx((parseFloat(str) || 0) * 10, dpi);
    }
    if (str.endsWith("in")) {
      return inToPx(parseFloat(str) || 0, dpi);
    }
    if (str.endsWith("pt")) {
      return ptToPx(parseFloat(str) || 0, dpi);
    }
    const num = parseFloat(str);
    return Number.isNaN(num) ? defaultVal : num;
  }
  var DEFAULT_OPTIMAL_OPTIONS = Object.freeze({
    freeLines: 2,
    growth: 1.18,
    cap: 1e6,
    fixedLines: 15,
    tableSplitLines: 15,
    reservePx: 4,
    minTableRows: 2,
    keepHeadings: true
  });
  function pageCostModel(options = {}) {
    const defaults = DEFAULT_OPTIMAL_OPTIONS;
    const {
      freeLines = defaults.freeLines,
      growth = defaults.growth,
      cap = defaults.cap,
      fixedLines = defaults.fixedLines,
      reservePx = defaults.reservePx
    } = options;
    if (![freeLines, cap, fixedLines, reservePx].every((x) => Number.isFinite(x) && x >= 0) || !Number.isFinite(growth) || growth <= 1) throw new PaginationError("Invalid pagination costs.");
    const logGrowth = Math.log(growth);
    const maximum = Math.log1p(cap);
    const whitespace = options.whitespaceCost ?? ((lines) => Math.min(cap, Math.expm1(Math.min(maximum, Math.max(0, lines - freeLines) * logGrowth))));
    const fixed = whitespace(fixedLines);
    const splitLines = options.tableSplitLines ?? defaults.tableSplitLines;
    const splitCost = whitespace(splitLines);
    if (!Number.isFinite(splitLines) || splitLines < 0 || !Number.isFinite(splitCost) || splitCost < 0)
      throw new PaginationError("Invalid table split cost.");
    return { reservePx, splitCost, cost(remainingPx, lineHeight, last) {
      const value = fixed + (last ? 0 : whitespace(Math.max(0, remainingPx) / lineHeight));
      if (!Number.isFinite(value) || value < 0) throw new PaginationError("Invalid page cost.");
      return value;
    } };
  }
  function tableUnits(node, capacity) {
    const rows = node.children.filter((c) => c.type === "table-body").flatMap((body) => body.children);
    if (!rows.length || node.rules.keepTogether && node.bounds.height <= capacity) return [];
    const header = node.children.find((c) => c.type === "table-head")?.bounds.height ?? 0;
    const top = node.tableLayout ? rows[0].bounds.top - node.bounds.top : header;
    const rowHeights = rows.map((row, i) => node.tableLayout && i + 1 < rows.length ? rows[i + 1].bounds.top - row.bounds.top : row.bounds.height);
    const tail = Math.max(0, node.bounds.height - top - rowHeights.reduce((a, b) => a + b, 0));
    const table = {
      count: rows.length,
      oversized: node.bounds.height > capacity,
      continuationTop: node.tableLayout?.continuationTop ?? header,
      blockedCuts: new Set(node.tableLayout?.blockedCuts)
    };
    return rows.map((_, index) => ({
      node,
      index,
      table,
      // A cut replaces the original inter-row gap with the table's bottom edge.
      cutBottom: node.tableLayout && index + 1 < rows.length ? node.tableLayout.fragmentBottom - (rows[index + 1].bounds.top - rows[index].bounds.bottom) : 0,
      height: rowHeights[index] + (index === 0 ? top : 0) + (index + 1 === rows.length ? tail : 0),
      forceBefore: index === 0 && node.rules.breakBefore,
      forceAfter: index + 1 === rows.length && node.rules.breakAfter
    }));
  }
  function fragment(start, end) {
    const table = start.table;
    const last = end.table === table ? end.index : table.count - 1;
    return {
      startRowIndex: start.index,
      endRowIndex: last,
      repeatsHeader: start.index > 0,
      isSplit: start.index > 0 || last + 1 < table.count
    };
  }
  function shortFragment(unit, first, last, min) {
    if (!unit.table || first === 0 && last + 1 === unit.table.count || last - first + 1 >= min) return 0;
    return unit.table.oversized ? 1 : Infinity;
  }
  var OptimalStrategy = class {
    constructor(options = {}) {
      this.options = options;
    }
    options;
    name = "optimal";
    paginate(input) {
      const { nodes, pageContentHeight: height, lineHeightPx, config } = input;
      if (!(lineHeightPx && Number.isFinite(lineHeightPx) && lineHeightPx > 0))
        throw new PaginationError("Optimal pagination requires a measured body line height.");
      const model = pageCostModel(this.options);
      const capacity = height - model.reservePx;
      const min = this.options.minTableRows ?? DEFAULT_OPTIMAL_OPTIONS.minTableRows;
      const keepHeadings = this.options.keepHeadings ?? DEFAULT_OPTIMAL_OPTIONS.keepHeadings;
      if (!(capacity > 0) || !Number.isSafeInteger(min) || min < 1) throw new PaginationError("Invalid page capacity or minimum table rows.");
      const plan = { pages: [], fixes: [], issues: [] };
      const units = [];
      for (const node of nodes) {
        if (!Number.isFinite(node.bounds.height) || node.bounds.height < 0) throw new PaginationError("Invalid block height.");
        const rows = node.type === "table" ? tableUnits(node, capacity) : [];
        if (rows.length) {
          for (const row of rows) units.push(row);
        } else if (node.bounds.height <= capacity) {
          units.push({ node, index: 0, height: node.bounds.height, forceBefore: node.rules.breakBefore, forceAfter: node.rules.breakAfter });
        } else {
          if (node.type === "table") throw new PaginationError("Oversized table has no measurable data rows: " + node.selector);
          const fallback = new GreedyScoredStrategy().paginate({ ...input, nodes: [node], pageContentHeight: capacity });
          plan.issues.push({ type: "oversized-element", severity: "warning", selector: node.selector, message: "\u8D85\u9AD8\u5757\u4F7F\u7528\u539F\u62C6\u5206\u89C4\u5219\uFF1A" + node.selector });
          plan.fixes.push(...fallback.fixes);
          for (const page of fallback.pages) {
            if (page.contentHeight > height) plan.issues.push({ type: "overflow", severity: "error", selector: node.selector, message: "\u8D85\u9AD8\u5185\u5BB9\uFF1A" + node.selector });
            units.push({ node, index: 0, fallback: page.items, height: page.contentHeight, forceBefore: true, forceAfter: true });
          }
        }
      }
      const count = units.length;
      const costs = new Float64Array(count + 1).fill(Infinity);
      const short = new Float64Array(count + 1).fill(Infinity);
      const violations = new Float64Array(count + 1).fill(Infinity);
      const previous = new Int32Array(count + 1);
      const usedHeight = new Float64Array(count + 1);
      const penalties = new Float64Array(count + 1);
      const protectedBreak = new Uint8Array(count + 1);
      for (let i = 1; i < count; i++) {
        const left = units[i - 1].node;
        const right = units[i];
        if (right.table && right.index > 0) {
          penalties[i] = right.table.blockedCuts.has(right.index) ? Infinity : model.splitCost;
        } else if (left !== right.node) {
          penalties[i] = this.options.breakPenalty?.(left, right.node) ?? 0;
          if (Number.isNaN(penalties[i]) || penalties[i] < 0) throw new PaginationError("Invalid break penalty.");
          if (right.node.type === "table" && (left.type === "heading" || left.rules.keepWithNext)) penalties[i] = Infinity;
          protectedBreak[i] = Number(left.type === "heading" ? keepHeadings !== false : left.rules.keepWithNext);
        }
      }
      costs[0] = short[0] = violations[0] = 0;
      for (let end = 1; end <= count; end++) {
        const last = units[end - 1];
        let base = last.cutBottom ?? 0;
        for (let start = end - 1; start >= 0; start--) {
          const first = units[start];
          base += first.height;
          if (base > capacity && !(start === end - 1 && first.fallback)) break;
          const used = base + (first.index > 0 ? first.table.continuationTop : 0);
          if (used <= capacity || first.fallback) {
            let misses = short[start];
            if (first.table) misses += shortFragment(first, first.index, first.table === last.table ? last.index : first.table.count - 1, min);
            if (last.table && last.table !== first.table) misses += shortFragment(last, 0, last.index, min);
            const broken = violations[start] + protectedBreak[end];
            const cost = costs[start] + model.cost(height - used, lineHeightPx, end === count) + penalties[end];
            if (Number.isFinite(misses) && Number.isFinite(cost) && (misses < short[end] || misses === short[end] && (broken < violations[end] || broken === violations[end] && cost < costs[end]))) {
              costs[end] = cost;
              short[end] = misses;
              violations[end] = broken;
              previous[end] = start;
              usedHeight[end] = used;
            }
          }
          if (first.forceBefore || units[start - 1]?.forceAfter) break;
        }
      }
      if (!Number.isFinite(costs[count])) throw new PaginationError("No legal pagination. Check row height (including its header), rowspans and forced breaks.");
      for (let end = count; end > 0; end = previous[end]) {
        const items = [];
        for (let i = previous[end]; i < end; ) {
          const unit = units[i];
          const { node, table } = unit;
          if (unit.fallback) {
            items.push(...unit.fallback);
            i++;
            continue;
          }
          const item = { nodeId: node.id, selector: node.selector, tagName: node.tagName, bounds: node.bounds };
          if (table) {
            const slice = fragment(unit, units[end - 1]);
            const length = slice.endRowIndex - slice.startRowIndex + 1;
            if (slice.isSplit) {
              item.tableSplit = slice;
              item.isPartial = true;
              const partHeight = units.slice(i, i + length).reduce((n, u) => n + u.height, 0) + (unit.index ? table.continuationTop : 0) + (units[i + length - 1].cutBottom ?? 0);
              item.bounds = { ...node.bounds, height: partHeight };
              if (length < min) plan.issues.push({
                type: "short-table-fragment",
                severity: "warning",
                selector: node.selector,
                message: "\u8D85\u9875\u8868\u683C\u65E0\u6CD5\u6EE1\u8DB3\u6700\u5C11\u884C\u6570\uFF0C\u653E\u5BBD\u81F3 " + length + " \u884C\u3002",
                details: { nodeId: node.id, startRowIndex: unit.index }
              });
              if (unit.index) plan.fixes.push({
                type: "split-table-repeat-header",
                selector: node.selector,
                description: "Continued table at data row " + (unit.index + 1)
              });
            }
            i += length;
          } else i++;
          items.push(item);
        }
        const used = usedHeight[end];
        plan.pages.push({
          pageNumber: 0,
          items,
          availableHeight: height,
          contentHeight: used,
          remainingSpace: height - used,
          hasForcedBreak: units[end - 1].forceAfter,
          isOversizedContinuation: false
        });
        if (protectedBreak[end]) plan.issues.push({
          type: "orphan-heading",
          severity: "warning",
          selector: units[end - 1].node.selector,
          message: "\u65E0\u53EF\u884C\u7684\u5B8C\u6574\u7EC4\u5408\uFF0C\u653E\u5BBD\u8DDF\u968F\u540E\u6587\u89C4\u5219\uFF1A" + units[end - 1].node.selector
        });
      }
      if (plan.pages.length > config.maxPages) throw new PaginationError("Pagination exceeded the maximum page count (" + config.maxPages + ").");
      plan.pages.reverse().forEach((page, i) => {
        page.pageNumber = i + 1;
        const first = page.items[0];
        if (i && first && !first.isPartial) plan.fixes.push({
          type: /^h[1-6]$/.test(first.tagName) ? "prevent-orphan-heading" : "move-to-next-page",
          selector: first.selector,
          fromPage: i,
          toPage: i + 1,
          description: "Started a new page at " + first.selector
        });
      });
      return plan;
    }
  };

  // src/styles/print-styles.ts
  function generatePrintStyles(pageConfig) {
    const { width, height, margin } = pageConfig;
    return `
/* BreakFlow Print Normalization Styles */
@media print {
  @page {
    size: ${width} ${height};
    margin: 0;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  /* Keep discretionary glyph combinations from changing the extracted text. */
  :where(body, body *) {
    font-variant-ligatures: none !important;
  }
}

.breakflow-container {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.breakflow-page {
  box-sizing: border-box;
  width: ${width};
  height: ${height};
  position: relative;
  page-break-after: always;
  break-after: page;
  overflow: hidden;
  background: white;
}

.breakflow-page:last-child {
  page-break-after: auto;
  break-after: auto;
}

.breakflow-page-content {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding-top: ${margin.top};
  padding-right: ${margin.right};
  padding-bottom: ${margin.bottom};
  padding-left: ${margin.left};
  overflow: hidden;
}

.breakflow-page:not(:first-child) [data-breakflow-page-root] > :first-child {
  margin-block-start: 0 !important;
}

.breakflow-table-slice tr {
  break-inside: avoid;
}

/* Screen Preview / Presentation Mode */
@media screen {
  .breakflow-preview-mode .breakflow-page {
    margin: 20px auto;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    border: 1px solid #e0e0e0;
  }
}
`;
  }

  // src/assets/asset-waiter.ts
  async function waitForAssets(doc, options = {}) {
    const timeoutMs = options.timeoutMs ?? 8e3;
    const throwOnTimeout = options.throwOnTimeout ?? false;
    let timedOut = false;
    const fontPromise = doc.fonts ? doc.fonts.ready : Promise.resolve();
    const imgElements = Array.from(doc.querySelectorAll("img"));
    const imgPromises = imgElements.map((img) => {
      if (img.loading === "lazy") {
        img.loading = "eager";
      }
      if (img.complete && img.naturalWidth !== 0) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const cleanup = () => {
          img.removeEventListener("load", onLoad);
          img.removeEventListener("error", onError);
        };
        const onLoad = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          resolve();
        };
        img.addEventListener("load", onLoad);
        img.addEventListener("error", onError);
      });
    });
    const allAssetsPromise = Promise.all([fontPromise, ...imgPromises]);
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve("timeout"), timeoutMs);
    });
    const result = await Promise.race([
      allAssetsPromise.then(() => "loaded"),
      timeoutPromise
    ]);
    if (result === "timeout") {
      timedOut = true;
      if (throwOnTimeout) {
        throw new AssetTimeoutError(`Images or web fonts did not settle in ${timeoutMs}ms`, timeoutMs);
      }
    }
    return {
      loadedImages: imgElements.length,
      timedOut
    };
  }

  // src/sandbox/iframe-sandbox.ts
  async function createIsolatedSandbox(sourceElement, pageConfig) {
    const parentDoc = sourceElement.ownerDocument || document;
    const iframe = parentDoc.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "-99999px";
    iframe.style.width = pageConfig.width;
    iframe.style.height = pageConfig.height;
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");
    parentDoc.body.appendChild(iframe);
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      iframe.remove();
      throw new Error("[BreakFlow] Unable to access isolated sandbox document in iframe.");
    }
    const styleNodes = Array.from(parentDoc.querySelectorAll('style, link[rel="stylesheet"]'));
    const stylesReady = [];
    for (const node of styleNodes) {
      const clone = node.cloneNode(true);
      if (clone.tagName === "LINK") {
        stylesReady.push(new Promise((done, fail) => {
          clone.addEventListener("load", () => done(), { once: true });
          clone.addEventListener("error", () => fail(new Error("Could not load print stylesheet: " + clone.getAttribute("href"))), { once: true });
        }));
      }
      iframeDoc.head.appendChild(clone);
    }
    const printStyle = iframeDoc.createElement("style");
    printStyle.id = "breakflow-injected-styles";
    printStyle.textContent = generatePrintStyles(pageConfig);
    iframeDoc.head.appendChild(printStyle);
    const container = iframeDoc.createElement("div");
    container.className = "breakflow-container";
    container.id = "breakflow-sandbox-root";
    container.style.boxSizing = "border-box";
    container.style.width = "100%";
    container.style.paddingTop = pageConfig.margin.top;
    container.style.paddingRight = pageConfig.margin.right;
    container.style.paddingBottom = pageConfig.margin.bottom;
    container.style.paddingLeft = pageConfig.margin.left;
    const clonedTarget = sourceElement.cloneNode(true);
    clonedTarget.style.maxWidth = "100%";
    clonedTarget.style.boxSizing = "border-box";
    container.appendChild(clonedTarget);
    iframeDoc.body.appendChild(container);
    wrapRootText(clonedTarget);
    try {
      await Promise.all(stylesReady);
      clonedTarget.getBoundingClientRect();
      await waitForAssets(iframeDoc);
    } catch (error) {
      iframe.remove();
      throw error;
    }
    const cleanup = () => {
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch {
      }
    };
    return {
      iframe,
      doc: iframeDoc,
      container,
      cleanup
    };
  }
  function wrapRootText(root) {
    const children = Array.from(root.childNodes);
    if (!children.some((node) => node.nodeType === 3 && node.textContent?.trim())) return;
    let inlineRun = [];
    const flushInlineRun = () => {
      const hasText = inlineRun.some((node) => node.nodeType === 3 && node.textContent?.trim());
      if (hasText) {
        const block = root.ownerDocument.createElement("span");
        block.style.display = "block";
        root.insertBefore(block, inlineRun[0]);
        block.append(...inlineRun);
      }
      inlineRun = [];
    };
    const view = root.ownerDocument.defaultView;
    for (const node of children) {
      const isInline = node.nodeType === 1 && view.getComputedStyle(node).display.startsWith("inline");
      if (node.nodeType === 3 || isInline) {
        inlineRun.push(node);
      } else {
        flushInlineRun();
      }
    }
    flushInlineRun();
  }

  // src/measurement/page-measurer.ts
  function measurePageDimensions(doc, pageConfig) {
    const testPage = doc.createElement("div");
    testPage.className = "breakflow-page";
    testPage.style.position = "absolute";
    testPage.style.top = "-10000px";
    testPage.style.left = "-10000px";
    testPage.style.width = pageConfig.width;
    testPage.style.height = pageConfig.height;
    testPage.style.boxSizing = "border-box";
    testPage.style.visibility = "hidden";
    const testContent = doc.createElement("div");
    testContent.className = "breakflow-page-content";
    testContent.style.boxSizing = "border-box";
    testContent.style.width = "100%";
    testContent.style.height = "100%";
    testContent.style.paddingTop = pageConfig.margin.top;
    testContent.style.paddingBottom = pageConfig.margin.bottom;
    testContent.style.paddingLeft = pageConfig.margin.left;
    testContent.style.paddingRight = pageConfig.margin.right;
    testPage.appendChild(testContent);
    doc.body.appendChild(testPage);
    const pageRect = testPage.getBoundingClientRect();
    const contentStyle = doc.defaultView ? doc.defaultView.getComputedStyle(testContent) : null;
    const paddingTop = contentStyle ? parseFloat(contentStyle.paddingTop) || 0 : 0;
    const paddingBottom = contentStyle ? parseFloat(contentStyle.paddingBottom) || 0 : 0;
    const paddingLeft = contentStyle ? parseFloat(contentStyle.paddingLeft) || 0 : 0;
    const paddingRight = contentStyle ? parseFloat(contentStyle.paddingRight) || 0 : 0;
    const contentWidthPx = Math.max(10, pageRect.width - paddingLeft - paddingRight);
    const contentHeightPx = Math.max(10, pageRect.height - paddingTop - paddingBottom);
    testPage.remove();
    return {
      pageWidthPx: pageRect.width,
      pageHeightPx: pageRect.height,
      contentWidthPx,
      contentHeightPx,
      marginTopPx: paddingTop,
      marginBottomPx: paddingBottom,
      marginLeftPx: paddingLeft,
      marginRightPx: paddingRight
    };
  }

  // src/measurement/layout-builder.ts
  var nodeCounter = 0;
  function buildLayoutTree(rootElement, config) {
    const containerRect = rootElement.getBoundingClientRect();
    const visibleChildren = Array.from(rootElement.children).filter((el) => isElementVisible(el));
    nodeCounter = 0;
    rootElement.querySelectorAll("table").forEach((table, index) => {
      table.dataset.breakflowTableIndex = String(index);
      const body = table.tBodies[0];
      if (!table.tHead && body) {
        while (body.rows[0]?.cells.length && Array.from(body.rows[0].cells).every((cell) => cell.tagName === "TH")) {
          table.createTHead().append(body.rows[0]);
        }
      }
    });
    return visibleChildren.map((el, index) => {
      const nextSibling = visibleChildren[index + 1];
      return buildNode(el, containerRect, config, nextSibling);
    });
  }
  function isElementVisible(el) {
    if (el.tagName.toLowerCase() === "script" || el.tagName.toLowerCase() === "style") {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    return true;
  }
  function determineNodeType(tagName) {
    switch (tagName) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return "heading";
      case "p":
        return "paragraph";
      case "table":
        return "table";
      case "thead":
        return "table-head";
      case "tbody":
        return "table-body";
      case "tr":
        return "table-row";
      case "img":
        return "image";
      case "figure":
        return "figure";
      case "figcaption":
        return "figcaption";
      case "ul":
      case "ol":
        return "list";
      case "li":
        return "list-item";
      case "pre":
      case "code":
        return "code";
      default:
        return "block";
    }
  }
  function matchesAnySelector(el, selectors) {
    for (const sel of selectors) {
      try {
        if (el.matches(sel)) return true;
      } catch {
      }
    }
    return false;
  }
  function extractNodeRules(el, type, tagName, config) {
    const computed = window.getComputedStyle(el);
    const dataBreakflow = el.getAttribute("data-breakflow") || "";
    const hasAttrKeep = dataBreakflow === "keep" || el.hasAttribute("data-breakflow-keep");
    const hasAttrKeepNext = dataBreakflow === "keep-next" || el.hasAttribute("data-breakflow-keep-next");
    const hasAttrBreakBefore = dataBreakflow === "break-before" || el.hasAttribute("data-breakflow-break-before");
    const hasAttrBreakAfter = dataBreakflow === "break-after" || el.hasAttribute("data-breakflow-break-after");
    const cssKeep = computed.getPropertyValue("--breakflow-keep").trim();
    const cssKeepNext = computed.getPropertyValue("--breakflow-keep-next").trim();
    const cssBreakBefore = computed.getPropertyValue("--breakflow-break-before").trim();
    const cssBreakAfter = computed.getPropertyValue("--breakflow-break-after").trim();
    const breakInside = computed.breakInside || computed.getPropertyValue("break-inside");
    const breakBeforeVal = computed.breakBefore || computed.getPropertyValue("break-before");
    const breakAfterVal = computed.breakAfter || computed.getPropertyValue("break-after");
    const cssAvoidBreakInside = breakInside === "avoid" || breakInside === "avoid-page";
    const cssForceBreakBefore = breakBeforeVal === "page" || breakBeforeVal === "always";
    const cssForceBreakAfter = breakAfterVal === "page" || breakAfterVal === "always";
    const selectorKeep = matchesAnySelector(el, config.rules.keepTogether);
    const selectorKeepNext = matchesAnySelector(el, config.rules.keepWithNext);
    const selectorBreakBefore = matchesAnySelector(el, config.rules.breakBefore);
    const selectorBreakAfter = matchesAnySelector(el, config.rules.breakAfter);
    let smartKeepTogether = false;
    let smartKeepWithNext = false;
    let repeatHeader = config.table.repeatHeader;
    let preventRowSplit = config.table.preventRowSplit;
    if (config.smartDefaults) {
      if (type === "heading") {
        smartKeepWithNext = true;
      }
      if (type === "figure" || type === "code" || tagName === "blockquote") {
        smartKeepTogether = true;
      }
      if (type === "table-row") {
        preventRowSplit = true;
      }
    }
    const keepTogether = hasAttrKeep || cssKeep === "true" || cssAvoidBreakInside || selectorKeep || smartKeepTogether;
    const keepWithNext = hasAttrKeepNext || cssKeepNext === "true" || selectorKeepNext || smartKeepWithNext;
    const breakBefore = hasAttrBreakBefore || cssBreakBefore === "true" || cssForceBreakBefore || selectorBreakBefore;
    const breakAfter = hasAttrBreakAfter || cssBreakAfter === "true" || cssForceBreakAfter || selectorBreakAfter;
    return {
      keepTogether,
      keepWithNext,
      breakBefore,
      breakAfter,
      repeatHeader,
      preventRowSplit
    };
  }
  function generateSelector(el) {
    if (el.id) return `#${el.id}`;
    const tag = el.tagName.toLowerCase();
    const classes = Array.from(el.classList).slice(0, 2).join(".");
    if (classes) return `${tag}.${classes}`;
    return tag;
  }
  function buildNode(el, containerRect, config, nextSibling) {
    const id = `bf-node-${++nodeCounter}`;
    el.setAttribute("data-breakflow-node-id", id);
    const tagName = el.tagName.toLowerCase();
    const type = determineNodeType(tagName);
    const rules = extractNodeRules(el, type, tagName, config);
    if (nextSibling?.tagName === "TABLE" && (type === "paragraph" || /[:：]$/u.test(el.innerText.trim()))) {
      rules.keepWithNext = true;
    }
    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);
    const marginBottom = parseFloat(computed.marginBottom) || 0;
    let effectiveHeight = rect.height;
    if (nextSibling) {
      const nextRect = nextSibling.getBoundingClientRect();
      const verticalGap = nextRect.top - rect.top;
      if (verticalGap > 0) {
        effectiveHeight = Math.max(effectiveHeight, verticalGap);
      }
    } else {
      effectiveHeight += marginBottom;
    }
    const bounds = {
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top,
      left: rect.left - containerRect.left,
      right: rect.right - containerRect.left,
      width: rect.width,
      height: effectiveHeight
    };
    const children = [];
    let tableLayout;
    if (type === "table") {
      const table = el;
      const bodies = Array.from(table.tBodies).filter(isElementVisible);
      const rows = bodies.flatMap((body) => Array.from(body.rows).filter(isElementVisible));
      const blockedCuts = /* @__PURE__ */ new Set();
      let offset = 0;
      for (const body of bodies) {
        const visibleRows = Array.from(body.rows).filter(isElementVisible);
        for (const [i, row] of visibleRows.entries()) {
          row.dataset.breakflowRowIndex = String(offset + i);
          for (const cell of Array.from(row.cells)) {
            const end = Math.min(visibleRows.length, cell.rowSpan ? i + cell.rowSpan : visibleRows.length);
            for (let j = i + 1; j < end; j++) blockedCuts.add(offset + j);
          }
        }
        offset += visibleRows.length;
      }
      const first = rows[0]?.getBoundingClientRect();
      const last = rows.at(-1)?.getBoundingClientRect();
      if (first && last) {
        const caption = table.caption?.getBoundingClientRect();
        tableLayout = {
          blockedCuts: [...blockedCuts],
          continuationTop: Math.max(0, first.top - rect.top - (caption && caption.bottom <= first.top ? caption.height : 0)),
          fragmentBottom: Math.max(0, rect.bottom - last.bottom - (table.tFoot?.getBoundingClientRect().height ?? 0) - (caption && caption.top >= last.bottom ? caption.height : 0))
        };
      }
      const tableParts = Array.from(el.children).filter((part) => isElementVisible(part));
      for (let p = 0; p < tableParts.length; p++) {
        children.push(buildNode(tableParts[p], containerRect, config, tableParts[p + 1]));
      }
    } else if (type === "table-head" || type === "table-body") {
      const rows = Array.from(el.children).filter((child) => child.tagName === "TR").filter((row) => isElementVisible(row));
      for (let r = 0; r < rows.length; r++) {
        children.push(buildNode(rows[r], containerRect, config, rows[r + 1]));
      }
    } else if (bounds.height > 600 && el.children.length > 0) {
      const elChildren = Array.from(el.children).filter((child) => isElementVisible(child));
      for (let c = 0; c < elChildren.length; c++) {
        children.push(buildNode(elChildren[c], containerRect, config, elChildren[c + 1]));
      }
    }
    return {
      id,
      selector: generateSelector(el),
      tagName,
      type,
      bounds,
      breakable: !rules.keepTogether || children.length > 0,
      rules,
      children,
      ...tableLayout ? { tableLayout } : {},
      domRefId: id
    };
  }

  // src/dom/dom-paginator.ts
  function constructPaginatedDOM(sandboxRoot, plan, pageConfig, doc) {
    const outputContainer = doc.createElement("div");
    outputContainer.className = "breakflow-paginated-root";
    for (const pageInfo of plan.pages) {
      const pageEl = doc.createElement("div");
      pageEl.className = "breakflow-page";
      pageEl.setAttribute("data-page-number", String(pageInfo.pageNumber));
      pageEl.style.width = pageConfig.width;
      pageEl.style.height = pageConfig.height;
      pageEl.style.boxSizing = "border-box";
      const contentEl = doc.createElement("div");
      contentEl.className = "breakflow-page-content";
      contentEl.setAttribute("data-page-content", String(pageInfo.pageNumber));
      contentEl.style.boxSizing = "border-box";
      contentEl.style.paddingTop = pageConfig.margin.top;
      contentEl.style.paddingRight = pageConfig.margin.right;
      contentEl.style.paddingBottom = pageConfig.margin.bottom;
      contentEl.style.paddingLeft = pageConfig.margin.left;
      let contentTarget = contentEl;
      if (sandboxRoot.tagName.toLowerCase() !== "body") {
        contentTarget = sandboxRoot.cloneNode(false);
        contentTarget.style.marginBlock = "0";
        contentTarget.style.paddingBlock = "0";
        contentTarget.style.minHeight = "0";
        contentTarget.style.height = "auto";
        contentTarget.style.maxHeight = "none";
        contentEl.appendChild(contentTarget);
      }
      contentTarget.setAttribute("data-breakflow-page-root", "");
      for (const item of pageInfo.items) {
        const sourceEl = sandboxRoot.querySelector(`[data-breakflow-node-id="${item.nodeId}"]`);
        if (!sourceEl) continue;
        if (item.tableSplit?.isSplit) {
          const tableSlice = createTableSlice(sourceEl, item.tableSplit, doc);
          contentTarget.appendChild(tableSlice);
        } else {
          const clonedNode = sourceEl.cloneNode(true);
          contentTarget.appendChild(clonedNode);
        }
      }
      pageEl.appendChild(contentEl);
      outputContainer.appendChild(pageEl);
    }
    return outputContainer;
  }
  function createTableSlice(originalTable, tableSplit, doc) {
    const tableClone = originalTable.cloneNode(false);
    tableClone.classList.add("breakflow-table-slice");
    const { startRowIndex, endRowIndex } = tableSplit;
    const bodies = Array.from(originalTable.tBodies);
    const dataRows = bodies.flatMap((body) => Array.from(body.rows)).filter((row) => row.hasAttribute("data-breakflow-row-index"));
    const final = endRowIndex + 1 === dataRows.length;
    tableClone.style.width = originalTable.getBoundingClientRect().width + "px";
    tableClone.style.maxWidth = "100%";
    if (!final) tableClone.style.marginBlockEnd = "0";
    if (originalTable.caption && (getComputedStyle(originalTable.caption).captionSide === "bottom" ? final : startRowIndex === 0)) {
      tableClone.append(originalTable.caption.cloneNode(true));
    }
    const rows = Array.from(originalTable.rows);
    const columnCount = rows.reduce((n, row) => Math.max(n, Array.from(row.cells).reduce((k, c) => k + c.colSpan, 0)), 0);
    const full = rows.find((row) => row.cells.length === columnCount);
    if (full) {
      tableClone.style.tableLayout = "fixed";
      const cols = doc.createElement("colgroup");
      const total = Array.from(full.cells).reduce((sum, cell) => sum + cell.getBoundingClientRect().width, 0);
      for (const cell of Array.from(full.cells)) {
        const col = doc.createElement("col");
        col.style.width = 100 * cell.getBoundingClientRect().width / total + "%";
        cols.append(col);
      }
      tableClone.append(cols);
    } else {
      for (const cols of originalTable.querySelectorAll(":scope > colgroup")) tableClone.append(cols.cloneNode(true));
    }
    if (originalTable.tHead && (startRowIndex === 0 || tableSplit.repeatsHeader)) {
      tableClone.append(originalTable.tHead.cloneNode(true));
    }
    for (const body of bodies) {
      const copy = body.cloneNode(false);
      for (const row of Array.from(body.rows)) {
        const index = row.dataset.breakflowRowIndex;
        if (index !== void 0 && +index >= startRowIndex && +index <= endRowIndex) copy.append(row.cloneNode(true));
      }
      if (copy.rows.length) tableClone.append(copy);
    }
    if (final && originalTable.tFoot) tableClone.append(originalTable.tFoot.cloneNode(true));
    return tableClone;
  }

  // src/debug/debug-overlay.ts
  function attachDebugOverlay(paginatedRoot, result, doc) {
    const overlayRoot = doc.createElement("div");
    overlayRoot.className = "breakflow-debug-overlay-root";
    overlayRoot.setAttribute("data-breakflow-debug", "true");
    overlayRoot.style.position = "absolute";
    overlayRoot.style.top = "0";
    overlayRoot.style.left = "0";
    overlayRoot.style.width = "100%";
    overlayRoot.style.height = "100%";
    overlayRoot.style.pointerEvents = "none";
    overlayRoot.style.zIndex = "99999";
    const pages = paginatedRoot.querySelectorAll(".breakflow-page");
    pages.forEach((pageEl, idx) => {
      const pageInfo = result.pages[idx];
      if (!pageInfo) return;
      const badge = doc.createElement("div");
      badge.className = "breakflow-debug-page-badge";
      badge.textContent = `Page ${pageInfo.pageNumber} / ${result.pageCount} [Used: ${Math.round(pageInfo.contentHeight)}px / ${Math.round(pageInfo.availableHeight)}px]`;
      badge.style.position = "absolute";
      badge.style.top = "4px";
      badge.style.right = "4px";
      badge.style.background = "#0f172a";
      badge.style.color = "#38bdf8";
      badge.style.fontSize = "10px";
      badge.style.fontFamily = "monospace";
      badge.style.padding = "3px 7px";
      badge.style.borderRadius = "4px";
      badge.style.opacity = "0.9";
      badge.style.zIndex = "1000";
      pageEl.appendChild(badge);
      pageEl.style.outline = "1px dashed #64748b";
      pageEl.style.outlineOffset = "-1px";
      const contentEl = pageEl.querySelector(".breakflow-page-content");
      if (contentEl) {
        for (const fix of result.fixes) {
          if (fix.toPage === pageInfo.pageNumber) {
            const target = contentEl.querySelector(fix.selector);
            if (target) {
              target.style.outline = "2px solid #22c55e";
              target.title = `BreakFlow Fix: ${fix.description}`;
            }
          }
        }
        for (const issue of result.issues) {
          if (issue.page === pageInfo.pageNumber && issue.selector) {
            const target = contentEl.querySelector(issue.selector);
            if (target) {
              target.style.outline = "2px solid #ef4444";
              target.title = `BreakFlow Issue [${issue.type}]: ${issue.message}`;
            }
          }
        }
      }
    });
    paginatedRoot.appendChild(overlayRoot);
    return overlayRoot;
  }

  // src/api/paginator.ts
  function measureLineHeight(root) {
    const paragraphs = Array.from(root.querySelectorAll("p")).filter((p) => p.getClientRects().length);
    const paragraph = paragraphs.reduce((longest, p) => !longest || p.innerText.length > longest.innerText.length ? p : longest, void 0) ?? root;
    const style = root.ownerDocument.defaultView.getComputedStyle(paragraph);
    const explicit = parseFloat(style.lineHeight);
    if (explicit > 0) return explicit;
    const probe = root.ownerDocument.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;";
    probe.style.font = style.font;
    paragraph.appendChild(probe);
    probe.textContent = "M";
    const single = probe.offsetHeight;
    probe.textContent = "M\nM";
    const height = probe.offsetHeight - single;
    probe.remove();
    return height || single;
  }
  var BrowserPaginator = class {
    config;
    strategy;
    constructor({ strategy, ...config } = {}) {
      this.config = resolveConfig(config);
      this.strategy = strategy === "greedy-scored" ? new GreedyScoredStrategy() : typeof strategy === "object" ? strategy : new OptimalStrategy(config.optimal);
    }
    resolveTargetElement(target) {
      if (typeof target === "string") {
        const el = document.querySelector(target);
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
    async analyze(target) {
      const startTime = performance.now();
      const sourceEl = this.resolveTargetElement(target);
      const prepStart = performance.now();
      const sandbox = await createIsolatedSandbox(sourceEl, this.config.page);
      const preparationMs = performance.now() - prepStart;
      try {
        const measureStart = performance.now();
        const pageDims = measurePageDimensions(sandbox.doc, this.config.page);
        const clonedRoot = sandbox.container.firstElementChild || sandbox.container;
        const nodes = buildLayoutTree(clonedRoot, this.config);
        const measurementMs = performance.now() - measureStart;
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
        const metrics = {
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
    async paginate(target, options = {}) {
      const startTime = performance.now();
      const sourceEl = this.resolveTargetElement(target);
      const prepStart = performance.now();
      const sandbox = await createIsolatedSandbox(sourceEl, this.config.page);
      const preparationMs = performance.now() - prepStart;
      try {
        const measureStart = performance.now();
        const pageDims = measurePageDimensions(sandbox.doc, this.config.page);
        const clonedRoot = sandbox.container.firstElementChild || sandbox.container;
        const nodes = buildLayoutTree(clonedRoot, this.config);
        const measurementMs = performance.now() - measureStart;
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
          if (!targetDoc.getElementById("breakflow-print-styles")) {
            const styleTag = targetDoc.createElement("style");
            styleTag.id = "breakflow-print-styles";
            styleTag.textContent = printStyles;
            targetDoc.head.appendChild(styleTag);
          }
        }
        const renderingMs = performance.now() - renderStart;
        const totalMs = performance.now() - startTime;
        const metrics = {
          lineHeightPx,
          preparationMs,
          measurementMs,
          planningMs,
          renderingMs,
          totalMs,
          measuredNodes: nodes.length,
          pages: plan.pages.length
        };
        const result = {
          pageCount: plan.pages.length,
          pages: plan.pages,
          issues: plan.issues,
          fixes: plan.fixes,
          metrics,
          element: paginatedRoot,
          styles: printStyles
        };
        if (this.config.debug) {
          attachDebugOverlay(paginatedRoot, result, targetDoc);
        }
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
  };
  function createPaginator(config) {
    return new BrowserPaginator(config);
  }
  return __toCommonJS(index_exports);
})();