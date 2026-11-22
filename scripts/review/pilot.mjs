import { digest } from './documents.mjs';

export const pilotSeed = 'unsliced-pilot-v1';
export const holdouts = new Map([
  ['samples/balanced-sections.html', '检验少用页和均衡留白的取舍'],
  ['samples/layout-stress.html', '检验多图和复杂排版'],
  ['samples/table-medium.html', '检验整表移动和拆表的取舍'],
  ['generated/generated-05.html', '检验密集标题附近的分页'],
  ['generated/generated-06.html', '检验图文和表格混排']
]);

const parameters = ['freeLines', 'growth', 'fixedLines', 'tableSplitLines'];
const cuts = variant => JSON.stringify(variant.costs.pages.flatMap(page => page.tableSlices
  .map(slice => [slice.id, slice.startRowIndex, slice.endRowIndex])));

export function pilotDifference({ a, b }) {
  const changed = parameters.filter(name => a.options[name] !== b.options[name]);
  const pageGap = Math.abs(a.images.length - b.images.length);
  const samePages = pageGap === 0;
  const sameCuts = cuts(a) === cuts(b);
  const priority = changed.length === 1 ? 0 : samePages !== sameCuts ? 1 : 2;
  return { changed, samePages, sameCuts, priority, pageGap };
}

const key = ({ document, a, b }) => [document.path, ...[a.id, b.id].sort()].join('\0');
const rank = (pair, stage) => digest([pilotSeed, stage, key(pair)].join('\0'));
const byRank = stage => (a, b) => rank(a, stage).localeCompare(rank(b, stage));
const isLong = pair => pair.document.category === '长表格';
const originalId = pair => `${pilotSeed}:${pair.id}`;
const compare = (a, b) => a.priority - b.priority || a.pageGap - b.pageGap;

export function buildPilot(pairs) {
  const pool = pairs.filter(pair => !holdouts.has(pair.document.path))
    .map(pair => ({ pair, ...pilotDifference(pair) }))
    .sort((a, b) => compare(a, b) || byRank('select')(a.pair, b.pair));
  const originals = [];
  const counts = new Map();
  let longCount = 0;
  function take(candidate, perDocument = 2) {
    const { pair } = candidate;
    const path = pair.document.path;
    if (originals.includes(pair) || (counts.get(path) ?? 0) >= perDocument || (isLong(pair) && longCount >= 10)) return;
    originals.push(pair);
    counts.set(path, (counts.get(path) ?? 0) + 1);
    if (isLong(pair)) longCount++;
  }
  // Reserve at least a quarter of the original questions for each page-count kind.
  for (const samePages of [true, false]) {
    for (const candidate of pool.filter(item => item.samePages === samePages)) {
      if (originals.filter(pair => pilotDifference(pair).samePages === samePages).length >= 9) break;
      take(candidate);
    }
  }
  for (const perDocument of [2, 3]) {
    for (const candidate of pool) {
      if (originals.length === 34) break;
      take(candidate, perDocument);
    }
  }
  if (originals.length !== 34 || new Set(originals.map(pair => pilotDifference(pair).samePages)).size !== 2) return [];

  // Interleave documents before inserting the swapped repeats.
  const groups = new Map();
  for (const pair of originals.sort(byRank('order'))) {
    const path = pair.document.path;
    if (!groups.has(path)) groups.set(path, []);
    groups.get(path).push(pair);
  }
  const ordered = [0, 1, 2].flatMap(offset => [...groups.values()].flatMap(group => group.slice(offset, offset + 1)));
  const questions = [];
  const repeated = new Set();
  for (const [index, pair] of ordered.entries()) {
    questions.push({ ...pair, id: originalId(pair), originalPairId: pair.id });
    if (![12, 16, 20, 24, 28, 33].includes(index + 1)) continue;
    const repeat = ordered.slice(0, index - 7).filter(candidate =>
      !repeated.has(candidate) && counts.get(candidate.document.path) < 3 &&
      (!isLong(candidate) || longCount < 10) &&
      candidate.document.path !== pair.document.path &&
      candidate.document.path !== ordered[index + 1]?.document.path
    ).sort((a, b) => compare(pilotDifference(a), pilotDifference(b)) || byRank('repeat')(a, b))[0];
    if (!repeat) return [];
    repeated.add(repeat);
    counts.set(repeat.document.path, counts.get(repeat.document.path) + 1);
    if (isLong(repeat)) longCount++;
    questions.push({ ...repeat, id: `${originalId(repeat)}:repeat`, originalPairId: repeat.id, repeatOf: originalId(repeat) });
  }
  return questions;
}
