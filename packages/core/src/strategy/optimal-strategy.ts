import type { LayoutNode, PageInfo, PaginationInput, PaginationPlan, PaginationStrategy } from '../types/index.js';
import { PaginationError } from '../errors/errors.js';
import { GreedyScoredStrategy } from './greedy-strategy.js';

export interface OptimalOptions {
  /** Whitespace-equivalent lines charged per interior table break. */
  tableSplitLines?: number;
  minTableRows?: number;
  freeLines?: number;
  growth?: number;
  cap?: number;
  fixedLines?: number;
  reservePx?: number;
  keepHeadings?: boolean;
  whitespaceCost?: (lines: number) => number;
  breakPenalty?: (left: LayoutNode, right: LayoutNode) => number;
}

export const DEFAULT_OPTIMAL_OPTIONS = Object.freeze({
  freeLines: 2, growth: 1.18, cap: 1e6, fixedLines: 15, tableSplitLines: 15,
  reservePx: 4, minTableRows: 2, keepHeadings: true
});

export function pageCostModel(options: OptimalOptions = {}) {
  const defaults = DEFAULT_OPTIMAL_OPTIONS;
  const { freeLines = defaults.freeLines, growth = defaults.growth, cap = defaults.cap,
    fixedLines = defaults.fixedLines, reservePx = defaults.reservePx } = options;
  if (![freeLines, cap, fixedLines, reservePx].every(x => Number.isFinite(x) && x >= 0) ||
      !Number.isFinite(growth) || growth <= 1) throw new PaginationError('Invalid pagination costs.');
  const logGrowth = Math.log(growth);
  const maximum = Math.log1p(cap);
  const whitespace = options.whitespaceCost ?? ((lines: number) =>
    Math.min(cap, Math.expm1(Math.min(maximum, Math.max(0, lines - freeLines) * logGrowth))));
  const fixed = whitespace(fixedLines);
  const splitLines = options.tableSplitLines ?? defaults.tableSplitLines;
  const splitCost = whitespace(splitLines);
  if (!Number.isFinite(splitLines) || splitLines < 0 || !Number.isFinite(splitCost) || splitCost < 0)
    throw new PaginationError('Invalid table split cost.');
  return { reservePx, splitCost, cost(remainingPx: number, lineHeight: number, last: boolean) {
    const value = fixed + (last ? 0 : whitespace(Math.max(0, remainingPx) / lineHeight));
    if (!Number.isFinite(value) || value < 0) throw new PaginationError('Invalid page cost.');
    return value;
  }};
}

interface TableRows {
  count: number;
  oversized: boolean;
  continuationTop: number;
  blockedCuts: Set<number>;
}

interface Unit {
  node: LayoutNode;
  height: number;
  forceBefore: boolean;
  forceAfter: boolean;
  table?: TableRows;
  cutBottom?: number;
  index: number;
  fallback?: PageInfo['items'];
}

// The sum of a complete table's units equals its original measured height.
// An interior break incurs fresh top chrome (including the repeated header)
// and bottom chrome. Original captions, footer and trailing margin occur once.
function tableUnits(node: LayoutNode, capacity: number): Unit[] {
  const rows = node.children.filter(c => c.type === 'table-body').flatMap(body => body.children);
  if (!rows.length || (node.rules.keepTogether && node.bounds.height <= capacity)) return [];
  const header = node.children.find(c => c.type === 'table-head')?.bounds.height ?? 0;
  const top = node.tableLayout ? rows[0]!.bounds.top - node.bounds.top : header;
  const rowHeights = rows.map((row, i) => node.tableLayout && i + 1 < rows.length
    ? rows[i + 1]!.bounds.top - row.bounds.top : row.bounds.height);
  const tail = Math.max(0, node.bounds.height - top - rowHeights.reduce((a,b) => a+b, 0));
  const table = { count: rows.length, oversized: node.bounds.height > capacity,
    continuationTop: node.tableLayout?.continuationTop ?? header,
    blockedCuts: new Set(node.tableLayout?.blockedCuts) };
  return rows.map((_, index) => ({
    node, index, table,
    // A cut replaces the original inter-row gap with the table's bottom edge.
    cutBottom: node.tableLayout && index + 1 < rows.length
      ? node.tableLayout.fragmentBottom - (rows[index + 1]!.bounds.top - rows[index]!.bounds.bottom) : 0,
    height: rowHeights[index]! + (index === 0 ? top : 0) + (index + 1 === rows.length ? tail : 0),
    forceBefore: index === 0 && node.rules.breakBefore, forceAfter: index + 1 === rows.length && node.rules.breakAfter
  }));
}

function fragment(start: Unit, end: Unit) {
  const table = start.table!;
  const last = end.table === table ? end.index : table.count - 1;
  return { startRowIndex: start.index, endRowIndex: last, repeatsHeader: start.index > 0,
    isSplit: start.index > 0 || last + 1 < table.count };
}

// Only the two table fragments touching a page boundary can be partial.
function shortFragment(unit: Unit, first: number, last: number, min: number): number {
  if (!unit.table || (first === 0 && last + 1 === unit.table.count) || last - first + 1 >= min) return 0;
  return unit.table.oversized ? 1 : Infinity;
}

export class OptimalStrategy implements PaginationStrategy {
  readonly name = 'optimal';
  constructor(private readonly options: OptimalOptions = {}) {}

  paginate(input: PaginationInput): PaginationPlan {
    const { nodes, pageContentHeight: height, lineHeightPx, config } = input;
    if (!(lineHeightPx && Number.isFinite(lineHeightPx) && lineHeightPx > 0))
      throw new PaginationError('Optimal pagination requires a measured body line height.');
    const model = pageCostModel(this.options);
    const capacity = height - model.reservePx;
    const min = this.options.minTableRows ?? DEFAULT_OPTIMAL_OPTIONS.minTableRows;
    const keepHeadings = this.options.keepHeadings ?? DEFAULT_OPTIMAL_OPTIONS.keepHeadings;
    if (!(capacity > 0) || !Number.isSafeInteger(min) || min < 1) throw new PaginationError('Invalid page capacity or minimum table rows.');
    const plan: PaginationPlan = { pages: [], fixes: [], issues: [] };
    const units: Unit[] = [];
    for (const node of nodes) {
      if (!Number.isFinite(node.bounds.height) || node.bounds.height < 0) throw new PaginationError('Invalid block height.');
      const rows = node.type === 'table' ? tableUnits(node, capacity) : [];
      if (rows.length) {
        for (const row of rows) units.push(row);
      } else if (node.bounds.height <= capacity) {
        units.push({ node, index: 0, height: node.bounds.height, forceBefore: node.rules.breakBefore, forceAfter: node.rules.breakAfter });
      } else {
        if (node.type === 'table') throw new PaginationError('Oversized table has no measurable data rows: ' + node.selector);
        const fallback = new GreedyScoredStrategy().paginate({ ...input, nodes: [node], pageContentHeight: capacity });
        plan.issues.push({ type: 'oversized-element', severity: 'warning', selector: node.selector, message: '超高块使用原拆分规则：' + node.selector });
        plan.fixes.push(...fallback.fixes);
        for (const page of fallback.pages) {
          if (page.contentHeight > height) plan.issues.push({ type: 'overflow', severity: 'error', selector: node.selector, message: '超高内容：' + node.selector });
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
      const left = units[i - 1]!.node;
      const right = units[i]!;
      if (right.table && right.index > 0) {
        penalties[i] = right.table.blockedCuts.has(right.index) ? Infinity : model.splitCost;
      } else if (left !== right.node) {
        penalties[i] = this.options.breakPenalty?.(left, right.node) ?? 0;
        if (Number.isNaN(penalties[i]) || penalties[i]! < 0) throw new PaginationError('Invalid break penalty.');
        if (right.node.type === 'table' && (left.type === 'heading' || left.rules.keepWithNext)) penalties[i] = Infinity;
        protectedBreak[i] = Number(left.type === 'heading' ? keepHeadings !== false : left.rules.keepWithNext);
      }
    }
    costs[0] = short[0] = violations[0] = 0;
    for (let end = 1; end <= count; end++) {
      const last = units[end - 1]!;
      let base = last.cutBottom ?? 0;
      for (let start = end - 1; start >= 0; start--) {
        const first = units[start]!;
        base += first.height;
        if (base > capacity && !(start === end - 1 && first.fallback)) break;
        const used = base + (first.index > 0 ? first.table!.continuationTop : 0);
        if (used <= capacity || first.fallback) {
          let misses = short[start]!;
          if (first.table) misses += shortFragment(first, first.index, first.table === last.table ? last.index : first.table.count - 1, min);
          if (last.table && last.table !== first.table) misses += shortFragment(last, 0, last.index, min);
          const broken = violations[start]! + protectedBreak[end]!;
          const cost = costs[start]! + model.cost(height - used, lineHeightPx, end === count) + penalties[end]!;
          if (Number.isFinite(misses) && Number.isFinite(cost) && (misses < short[end]! || (misses === short[end] &&
              (broken < violations[end]! || (broken === violations[end] && cost < costs[end]!))))) {
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
    if (!Number.isFinite(costs[count])) throw new PaginationError('No legal pagination. Check row height (including its header), rowspans and forced breaks.');
    for (let end = count; end > 0; end = previous[end]!) {
      const items: PageInfo['items'] = [];
      for (let i = previous[end]!; i < end;) {
        const unit = units[i]!;
        const { node, table } = unit;
        if (unit.fallback) { items.push(...unit.fallback); i++; continue; }
        const item: PageInfo['items'][number] = { nodeId: node.id, selector: node.selector, tagName: node.tagName, bounds: node.bounds };
        if (table) {
          const slice = fragment(unit, units[end - 1]!);
          const length = slice.endRowIndex - slice.startRowIndex + 1;
          if (slice.isSplit) {
            item.tableSplit = slice;
            item.isPartial = true;
            const partHeight = units.slice(i, i + length).reduce((n,u) => n + u.height, 0)
              + (unit.index ? table.continuationTop : 0) + (units[i + length - 1]!.cutBottom ?? 0);
            item.bounds = { ...node.bounds, height: partHeight };
            if (length < min) plan.issues.push({ type: 'short-table-fragment', severity: 'warning', selector: node.selector,
              message: '超页表格无法满足最少行数，放宽至 ' + length + ' 行。', details: { nodeId: node.id, startRowIndex: unit.index } });
            if (unit.index) plan.fixes.push({ type: 'split-table-repeat-header', selector: node.selector,
              description: 'Continued table at data row ' + (unit.index + 1) });
          }
          i += length;
        } else i++;
        items.push(item);
      }
      const used = usedHeight[end]!;
      plan.pages.push({ pageNumber: 0, items, availableHeight: height, contentHeight: used,
        remainingSpace: height - used, hasForcedBreak: units[end - 1]!.forceAfter, isOversizedContinuation: false });
      if (protectedBreak[end]) plan.issues.push({ type: 'orphan-heading', severity: 'warning', selector: units[end - 1]!.node.selector,
        message: '无可行的完整组合，放宽跟随后文规则：' + units[end - 1]!.node.selector });
    }
    if (plan.pages.length > config.maxPages) throw new PaginationError('Pagination exceeded the maximum page count (' + config.maxPages + ').');
    plan.pages.reverse().forEach((page, i) => {
      page.pageNumber = i + 1;
      const first = page.items[0];
      if (i && first && !first.isPartial) plan.fixes.push({
        type: /^h[1-6]$/.test(first.tagName) ? 'prevent-orphan-heading' : 'move-to-next-page',
        selector: first.selector, fromPage: i, toPage: i + 1, description: 'Started a new page at ' + first.selector
      });
    });
    return plan;
  }
}
