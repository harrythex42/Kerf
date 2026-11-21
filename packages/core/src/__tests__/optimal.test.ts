import { expect, it } from 'vitest';
import { OptimalStrategy, resolveConfig, type LayoutNode } from '../index.js';

function block(i: number, height: number, heading = false): LayoutNode {
  return {
    id: String(i), selector: '#n' + i, type: heading ? 'heading' : 'paragraph', tagName: heading ? 'h2' : 'p',
    bounds: { top: 0, bottom: height, left: 0, right: 100, width: 100, height },
    breakable: false, rules: { keepWithNext: heading, keepTogether: true, breakBefore: false, breakAfter: false }, children: []
  };
}
const config = resolveConfig();
const input = (nodes: LayoutNode[]) => ({ nodes, config, pageContentHeight: 100, pageContentWidth: 100, lineHeightPx: 5 });

it('matches an exhaustive cut-mask oracle on 300 seeded documents of 10–15 blocks', () => {
  let seed = 75149;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const charge = (used: number, last: boolean) =>
    (1.18 ** 13 - 1) + (last ? 0 : Math.min(1e6, 1.18 ** Math.max(0, (100 - used) / 5 - 2) - 1));
  for (let sample = 0; sample < 300; sample++) {
    const nodes = Array.from({ length: 10 + sample % 6 }, (_, i) => block(i, 3 + Math.floor(random() * 82), random() < .23));
    nodes.forEach(node => { node.rules.breakBefore = random() < .06; });
    let bestBroken = Infinity;
    let bestCost = Infinity;
    for (let mask = 0; mask < 2 ** (nodes.length - 1); mask++) {
      let used = 0, broken = 0, cost = 0;
      let valid = true;
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]!;
        used += node.bounds.height;
        const last = i === nodes.length - 1;
        const cut = last || Boolean(mask & (1 << i));
        if (used > 96 || (!cut && nodes[i + 1]?.rules.breakBefore)) { valid = false; break; }
        if (cut) {
          cost += charge(used, last);
          broken += Number(!last && node.type === 'heading');
          used = 0;
        }
      }
      if (valid && (broken < bestBroken || (broken === bestBroken && cost < bestCost))) {
        bestBroken = broken;
        bestCost = cost;
      }
    }
    const plan = new OptimalStrategy().paginate(input(nodes));
    expect(plan.pages.flatMap(p => p.items.map(i => i.nodeId))).toEqual(nodes.map(n => n.id));
    expect(plan.issues.length).toBe(bestBroken);
    expect(plan.pages.reduce((sum, page, i) => sum + charge(page.contentHeight, i === plan.pages.length - 1), 0)).toBeCloseTo(bestCost, 8);
  }
});

it('plans 5000 blocks within a second', () => {
  const nodes = Array.from({ length: 5000 }, (_, i) => block(i, 16 + i % 11, i % 17 === 0));
  const start = performance.now();
  const result = new OptimalStrategy().paginate({ ...input(nodes), pageContentHeight: 1000 });
  const elapsed = performance.now() - start;
  console.log('5000 premeasured blocks:', elapsed.toFixed(1), 'ms');
  expect(result.pages.flatMap(p => p.items)).toHaveLength(5000);
  expect(elapsed).toBeLessThan(1000);
});

it('honors custom costs and keeps the original table splitter for oversized tables', () => {
  const nodes = [block(0, 32), block(1, 32), block(2, 32), block(3, 32)];
  const plan = new OptimalStrategy({ whitespaceCost: () => 0, breakPenalty: left => left.id === '1' ? Infinity : 0 }).paginate(input(nodes));
  expect(plan.pages.slice(0, -1).every(p => p.items.at(-1)?.nodeId !== '1')).toBe(true);
  const table = block(10, 160);
  table.type = 'table';
  table.tagName = 'table';
  const body = block(11, 160);
  body.type = 'table-body';
  body.tagName = 'tbody';
  body.children = [0, 1, 2, 3].map(i => ({ ...block(i, 40), type: 'table-row', tagName: 'tr' }));
  table.children = [body];
  const split = new OptimalStrategy().paginate(input([table]));
  expect(split.pages.length).toBeGreaterThan(1);
  expect(split.issues.some(i => i.type === 'oversized-element')).toBe(true);
});
