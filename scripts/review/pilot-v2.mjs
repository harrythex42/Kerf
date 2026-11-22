import { digest } from './documents.mjs';
import { holdouts, pilotDifference } from './pilot.mjs';
import { nearbyValues } from './profiles.mjs';

export const seedV2 = 'unsliced-pilot-v2';
const parameters = Object.keys(nearbyValues);
const long = document => document.category === '长表格';
const order = (pair, stage) => digest([seedV2, stage, pair.document.path, pair.a.id, pair.b.id].join('\0'));
const byOrder = stage => (a, b) => order(a, stage).localeCompare(order(b, stage));
const counts = () => Object.fromEntries([...parameters, 'mixed'].map(name => [name, 0]));
const gap = ({ a, b }) => Math.abs(a.images.length - b.images.length);
const pageKind = pair => gap(pair) === 0 ? 1 : 2;

function comparison(a, b) {
  for (const aOptions of a.equivalentOptions ?? [a.options]) {
    for (const bOptions of b.equivalentOptions ?? [b.options]) {
      const changed = parameters.filter(key => aOptions[key] !== bOptions[key]);
      if (changed.length === 1) return { parameter: changed[0], aOptions, bOptions };
    }
  }
  return null;
}

function remember(states, key, candidate) {
  const prior = states.get(key);
  if (!prior || prior.score < candidate.score) states.set(key, candidate);
}

function choices(pairs) {
  let states = new Map([['0,0,0', { originals: [], repeats: [], score: 0, kind: 0 }]]);
  for (const pair of pairs) {
    const next = new Map(states);
    for (const state of states.values()) {
      const n = state.originals.length, r = state.repeats.length;
      const kind = state.kind | pageKind(pair);
      // One-parameter questions outrank all other scoring preferences combined.
      const quality = (pair.comparison ? 1000 : 0) + (pilotDifference(pair).priority <= 1 ? 4 : 0) - gap(pair);
      if (n + r < 3) remember(next, [n + 1, r, kind].join(','), {
        originals: [...state.originals, pair], repeats: state.repeats, score: state.score + quality, kind
      });
      if (gap(pair) <= 1 && n + r < 2) remember(next, [n + 1, r + 1, kind].join(','), {
        originals: [...state.originals, pair], repeats: [...state.repeats, pair],
        score: state.score + quality + (pair.comparison ? 2 : 0), kind
      });
    }
    states = next;
  }
  return [...states.values()];
}

export function planPilotV2({ documents, datasetId }) {
  const summary = { singleLayouts: 0, noLayouts: 0, singleAfterFilter: 0, excluded: 0, excludedInPilot: 0,
    candidateGaps: [0, 0, 0], candidateParameters: counts(), eligibleDocuments: 0 };
  const groups = [];
  for (const { variants, rejected, ...document } of documents) {
    if (!variants.length) { summary.noLayouts++; continue; }
    if (variants.length === 1) summary.singleLayouts++;
    const minimum = Math.min(...variants.map(variant => variant.images.length));
    const kept = variants.filter(variant => 2 * variant.images.length <= 3 * minimum);
    summary.excluded += variants.length - kept.length;
    if (kept.length === 1) summary.singleAfterFilter++;
    if (holdouts.has(document.path)) continue;
    summary.excludedInPilot += variants.length - kept.length;
    const pairs = kept.flatMap((a, i) => kept.slice(i + 1).map(b => ({
      id: digest([datasetId, a.id, b.id].join(' ')).slice(0, 24), document, a, b, comparison: comparison(a, b)
    }))).filter(pair => gap(pair) <= 2).sort(byOrder('select'));
    for (const pair of pairs) {
      summary.candidateGaps[gap(pair)]++;
      summary.candidateParameters[pair.comparison?.parameter ?? 'mixed']++;
    }
    if (pairs.length) groups.push({ document, pairs });
  }
  groups.sort((a, b) => a.document.path.localeCompare(b.document.path));
  summary.eligibleDocuments = groups.length;

  // Keep the best reachable plan for each combination of original, repeat and long-table counts.
  let states = new Map([['0,0,0,0', { originals: [], repeats: [], score: 0, kind: 0, longCount: 0 }]]);
  for (const { document, pairs } of groups) {
    const next = new Map();
    for (const option of choices(pairs)) for (const state of states.values()) {
      const n = option.originals.length + state.originals.length;
      const r = option.repeats.length + state.repeats.length;
      const longCount = state.longCount + (long(document) ? option.originals.length + option.repeats.length : 0);
      const kind = state.kind | option.kind;
      if (n + r > 40 || r > 6 || longCount > 10) continue;
      remember(next, [n, r, longCount, kind].join(','), {
        originals: [...state.originals, ...option.originals], repeats: [...state.repeats, ...option.repeats],
        score: state.score + option.score, longCount, kind
      });
    }
    states = next;
  }
  const legal = [...states.values()].filter(({ originals, repeats, longCount, kind }) =>
    4 * longCount <= originals.length + repeats.length && kind === 3 &&
    (!repeats.length || originals.length >= 9));
  // First keep the requested six repeats if possible, then maximize the total without relaxing any caps.
  legal.sort((a, b) => Number(b.repeats.length === 6) - Number(a.repeats.length === 6) ||
    b.originals.length + b.repeats.length - a.originals.length - a.repeats.length ||
    b.repeats.length - a.repeats.length || b.score - a.score);
  const best = legal[0] ?? { originals: [], repeats: [], longCount: 0 };
  const total = best.originals.length + best.repeats.length;
  const questions = [];
  const represented = best.repeats.sort(byOrder('repeat'));
  const other = best.originals.filter(pair => !represented.includes(pair)).sort(byOrder('order'));
  const id = pair => `${seedV2}:${pair.id}`;
  for (const pair of represented) questions.push({ ...pair, id: id(pair), originalPairId: pair.id });
  const repeatPositions = new Map(represented.map((pair, i) => [
    i + 9 + Math.floor((total - represented.length - 9) * (i + 1) / represented.length), pair
  ]));
  while (questions.length < total) {
    const repeat = repeatPositions.get(questions.length);
    if (repeat) questions.push({ ...repeat, id: `${id(repeat)}:repeat`, originalPairId: repeat.id, repeatOf: id(repeat) });
    else {
      const index = other.findIndex(pair => pair.document.path !== questions.at(-1)?.document.path);
      const [pair] = other.splice(Math.max(0, index), 1);
      questions.push({ ...pair, id: id(pair), originalPairId: pair.id });
    }
  }
  const stats = { ...summary, originals: best.originals.length, repeats: represented.length, total,
    longCount: best.longCount, pageGaps: [0, 0, 0], parameters: counts(), originalParameters: counts() };
  for (const question of questions) {
    const parameter = question.comparison?.parameter ?? 'mixed';
    stats.pageGaps[gap(question)]++;
    stats.parameters[parameter]++;
    if (!question.repeatOf) stats.originalParameters[parameter]++;
  }
  return { questions, stats, ready: total === 40 && represented.length === 6 };
}
