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

it('honors custom costs and optimizes oversized tables using row boundaries', () => {
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
  expect(split.issues).toEqual([]);
  expect(split.pages.map(p => p.items[0]?.tableSplit?.endRowIndex)).toEqual([1, 3]);
});

function measuredTable(id: number, header: number, heights: number[]): LayoutNode {
  const table = block(id, header + heights.reduce((a,b) => a + b, 0));
  table.type = 'table';
  table.tagName = 'table';
  table.rules.keepTogether = false;
  const head = block(-1, header);
  head.type = 'table-head';
  const body = block(-2, table.bounds.height - header);
  body.type = 'table-body';
  body.children = heights.map((h, i) => ({ ...block(i,h), type: 'table-row' }));
  table.children = [head, body];
  return table;
}

it('matches enumeration including repeated headers, distinct tables on a page and unavoidable short fragments', () => {
  let seed = 9103;
  const draw = (limit: number) => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) % limit);
  for (let sample = 0; sample < 350; sample++) {
    const min = 2 + draw(2);
    const splitLines = draw(35);
    const nodes = [block(0, 8 + draw(47))];
    const atoms: { node: LayoutNode; height: number; header: number; rows: number }[] =
      [{ node: nodes[0]!, height: nodes[0]!.bounds.height, header: 0, rows: 0 }];
    for (let t = 0; t < 2; t++) {
      const heights = Array.from({ length: 2 + draw(4) }, () => 5 + draw(44));
      const header = 5 + draw(17);
      const node = measuredTable(t + 1, header, heights);
      nodes.push(node);
      atoms.push(...heights.map(height => ({ node, height, header, rows: heights.length })));
    }
    const white = (lines: number) => 1.18 ** Math.max(0, lines - 2) - 1;
    let bestShort = Infinity, bestCost = Infinity;
    for (let mask = 0; mask < 2 ** (atoms.length - 1); mask++) {
      let cost = 0, short = 0, used = 0, inPart = 0;
      for (let i = 0; i < atoms.length; i++) {
        const a = atoms[i]!;
        if (!inPart) used += a.header;
        inPart++;
        used += a.height;
        if (used > 96) { cost = Infinity; break; }
        const last = i + 1 === atoms.length;
        const cut = last || Boolean(mask & 2 ** i);
        const sameTableNext = a.node === atoms[i + 1]?.node;
        if (cut || !sameTableNext) {
          if (a.rows && inPart < a.rows && inPart < min) short += a.node.bounds.height > 96 ? 1 : Infinity;
          inPart = 0;
        }
        if (cut) {
          cost += white(15) + (last ? 0 : white((100 - used) / 5)) + (sameTableNext ? white(splitLines) : 0);
          used = 0;
        }
      }
      if (Number.isFinite(cost) && (short < bestShort || (short === bestShort && cost < bestCost))) {
        bestShort = short; bestCost = cost;
      }
    }
    const result = new OptimalStrategy({ minTableRows: min, tableSplitLines: splitLines }).paginate(input(nodes));
    let cost = 0;
    for (const [i, page] of result.pages.entries()) {
      let used = 0;
      for (const item of page.items) {
        const node = nodes.find(n => n.id === item.nodeId)!;
        const slice = item.tableSplit;
        if (slice) {
          used += node.children[0]!.bounds.height + node.children[1]!.children.slice(slice.startRowIndex, slice.endRowIndex + 1)
            .reduce((sum, row) => sum + row.bounds.height, 0);
          if (slice.startRowIndex > 0) cost += white(splitLines);
        } else used += node.bounds.height;
      }
      expect(used).toBe(page.contentHeight);
      expect(used).toBeLessThanOrEqual(96);
      cost += white(15) + (i + 1 === result.pages.length ? 0 : white((100 - used) / 5));
    }
    expect(result.issues.filter(i => i.type === 'short-table-fragment')).toHaveLength(bestShort);
    expect(cost).toBeCloseTo(bestCost, 8);
  }
});

it('keeps an intro with the first rows, respects rowspan boundaries and reports an impossible row', () => {
  const intro = block(0, 20, true);
  const table = measuredTable(1, 10, [35, 24, 22, 20, 19]);
  // Synthetic source positions, as measured by the browser.
  let top = 10;
  for (const row of table.children[1]!.children) {
    row.bounds.top = top;
    top += row.bounds.height;
    row.bounds.bottom = top;
  }
  table.tableLayout = { blockedCuts: [2], continuationTop: 10, fragmentBottom: 0 };
  const plan = new OptimalStrategy({ minTableRows: 1 }).paginate(input([intro, table]));
  expect(plan.pages[0]!.items.map(item => item.nodeId)).toEqual([intro.id, table.id]);
  expect(plan.pages.some(p => p.items.some(item => item.tableSplit?.startRowIndex === 2))).toBe(false);
  expect(() => new OptimalStrategy().paginate(input([measuredTable(1, 20, [85, 10])]))).toThrow('No legal pagination');
});
