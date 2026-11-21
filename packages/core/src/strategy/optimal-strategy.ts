import type { LayoutNode, PageInfo, PaginationInput, PaginationPlan, PaginationStrategy } from '../types/index.js';
import { PaginationError } from '../errors/errors.js';
import { GreedyScoredStrategy } from './greedy-strategy.js';

export interface OptimalOptions {
  freeLines?: number;
  growth?: number;
  cap?: number;
  fixedLines?: number;
  reservePx?: number;
  keepHeadings?: boolean;
  whitespaceCost?: (lines: number) => number;
  breakPenalty?: (left: LayoutNode, right: LayoutNode) => number;
}

export function pageCostModel(options: OptimalOptions = {}) {
  const { freeLines = 2, growth = 1.18, cap = 1e6, fixedLines = 15, reservePx = 4 } = options;
  if (![freeLines, cap, fixedLines, reservePx].every(x => Number.isFinite(x) && x >= 0) ||
      !Number.isFinite(growth) || growth <= 1) throw new PaginationError('Invalid pagination costs.');
  const logGrowth = Math.log(growth);
  const maximum = Math.log1p(cap);
  const whitespace = options.whitespaceCost ?? ((lines: number) =>
    Math.min(cap, Math.expm1(Math.min(maximum, Math.max(0, lines - freeLines) * logGrowth))));
  const fixed = whitespace(fixedLines);
  return { reservePx, cost(remainingPx: number, lineHeight: number, last: boolean) {
    const value = fixed + (last ? 0 : whitespace(Math.max(0, remainingPx) / lineHeight));
    if (!Number.isFinite(value) || value < 0) throw new PaginationError('Invalid page cost.');
    return value;
  }};
}

export class OptimalStrategy implements PaginationStrategy {
  readonly name = 'optimal';
  constructor(private readonly options: OptimalOptions = {}) {}

  paginate(input: PaginationInput): PaginationPlan {
    const { nodes, pageContentHeight: height, lineHeightPx } = input;
    if (!(lineHeightPx && Number.isFinite(lineHeightPx) && lineHeightPx > 0)) {
      throw new PaginationError('Optimal pagination requires a measured body line height.');
    }
    const model = pageCostModel(this.options);
    const capacity = height - model.reservePx;
    if (!(capacity > 0)) throw new PaginationError('Safety reserve exceeds page height.');
    const plan: PaginationPlan = { pages: [], fixes: [], issues: [] };
    const units: { node: LayoutNode; items: PageInfo['items']; height: number; forceBefore: boolean; forceAfter: boolean }[] = [];
    for (const node of nodes) {
      if (!Number.isFinite(node.bounds.height) || node.bounds.height < 0) throw new PaginationError('Invalid block height.');
      if (node.bounds.height <= capacity) {
        units.push({ node, items: [{ nodeId: node.id, tagName: node.tagName, selector: node.selector, bounds: node.bounds }],
          height: node.bounds.height, forceBefore: node.rules.breakBefore, forceAfter: node.rules.breakAfter });
      } else {
        const fallback = new GreedyScoredStrategy().paginate({ ...input, nodes: [node], pageContentHeight: capacity });
        plan.issues.push({ type: 'oversized-element', severity: 'warning', selector: node.selector,
          message: '超高块使用原拆分规则：' + node.selector });
        plan.fixes.push(...fallback.fixes);
        for (const page of fallback.pages) {
          if (page.contentHeight > height) plan.issues.push({ type: 'overflow', severity: 'error', selector: node.selector,
            message: '原拆分规则仍有超高内容：' + node.selector });
          units.push({ node, items: page.items, height: page.contentHeight, forceBefore: true, forceAfter: true });
        }
      }
    }

    const count = units.length;
    const costs = new Float64Array(count + 1).fill(Infinity);
    const violations = new Float64Array(count + 1).fill(Infinity);
    const previous = new Int32Array(count + 1);
    const penalties = new Float64Array(count + 1);
    const protectedBreak = new Uint8Array(count + 1);
    for (let i = 1; i < count; i++) {
      const left = units[i - 1]!.node;
      const right = units[i]!.node;
      if (left === right) continue;
      penalties[i] = this.options.breakPenalty?.(left, right) ?? 0;
      if (Number.isNaN(penalties[i]) || penalties[i]! < 0) throw new PaginationError('Invalid break penalty.');
      const heading = left.type === 'heading';
      protectedBreak[i] = Number(heading ? this.options.keepHeadings !== false : left.rules.keepWithNext);
    }
    costs[0] = violations[0] = 0;
    // D[end] considers every feasible contiguous last page of this prefix.
    // First minimize protected breaks, then minimize additive page costs.
    for (let end = 1; end <= count; end++) {
      let used = 0;
      for (let start = end - 1; start >= 0; start--) {
        const unit = units[start]!;
        used += unit.height;
        if (used > capacity && !(start === end - 1 && unit.forceBefore && unit.forceAfter)) break;
        const broken = violations[start]! + protectedBreak[end]!;
        const cost = costs[start]! + model.cost(height - used, lineHeightPx, end === count) + penalties[end]!;
        if (Number.isFinite(cost) && (broken < violations[end]! || (broken === violations[end] && cost < costs[end]!))) {
          costs[end] = cost;
          violations[end] = broken;
          previous[end] = start;
        }
        if (unit.forceBefore || units[start - 1]?.forceAfter) break;
      }
    }
    if (!Number.isFinite(costs[count])) throw new PaginationError('Configured break penalties admit no pagination.');
    for (let end = count; end > 0; end = previous[end]!) {
      const page = units.slice(previous[end], end);
      const contentHeight = page.reduce((sum, unit) => sum + unit.height, 0);
      plan.pages.push({ pageNumber: 0, items: page.flatMap(unit => unit.items), availableHeight: height, contentHeight,
        remainingSpace: height - contentHeight, hasForcedBreak: page.at(-1)!.forceAfter, isOversizedContinuation: false });
      if (protectedBreak[end]) plan.issues.push({ type: 'orphan-heading', severity: 'warning', selector: units[end - 1]!.node.selector,
        message: '无可行的完整组合，放宽跟随后文规则：' + units[end - 1]!.node.selector });
    }
    plan.pages.reverse().forEach((page, i) => { page.pageNumber = i + 1; });
    return plan;
  }
}
