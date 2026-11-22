import { describe, expect, it } from 'vitest';
import { holdouts } from '../../scripts/review/pilot.mjs';
import { planPilotV2, seedV2 } from '../../scripts/review/pilot-v2.mjs';
import { baseline, nearbyProfiles, nearbyValues } from '../../scripts/review/profiles.mjs';

function document(path: string, sizes: number[], category = '报告') {
  return { path, category, variants: sizes.map((size, i) => ({
    id: `${path}:${i}`,
    images: Array(size).fill('page'),
    options: i === 0 ? { ...baseline, growth: 1.15 } : { ...baseline, fixedLines: 15 + i },
    equivalentOptions: i === 0 ? [baseline, { ...baseline, growth: 1.15 }] : undefined,
    costs: { pages: [{ tableSlices: [] }] }
  })) };
}

describe('near-default pagination pilot', () => {
  it('varies exactly one value at a time around the defaults', () => {
    expect(nearbyProfiles).toHaveLength(24);
    for (const profile of nearbyProfiles.slice(1)) {
      expect(Object.keys(baseline).filter(key => profile[key] !== baseline[key])).toHaveLength(1);
    }
    for (const [key, values] of Object.entries(nearbyValues)) {
      expect(values.filter((value: number) => value < baseline[key]).length).toBeGreaterThanOrEqual(2);
      expect(values.filter((value: number) => value > baseline[key]).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps hard limits and deterministically builds an eligible full pilot', () => {
    const documents = Array.from({ length: 20 }, (_, i) =>
      document(`doc-${i}`, [4, 4, 5, 6, 7], i < 6 ? '长表格' : '报告'))
      .concat(document([...holdouts.keys()][0], [4, 4, 5, 6, 7]));
    const input = { datasetId: 'test', documents };
    const { ready, questions, stats } = planPilotV2(input);
    expect(ready).toBe(true);
    expect(questions).toHaveLength(40);
    expect(questions.map(q => q.id)).toEqual(planPilotV2({ ...input, documents: [...documents].reverse() })
      .questions.map(q => q.id));
    expect(stats.excluded).toBe(21);
    expect(stats.excludedInPilot).toBe(20);
    expect(stats.candidateGaps).toEqual([20, 60, 40]);
    expect(stats.parameters.fixedLines).toBe(40);
    expect(stats.repeats).toBe(6);
    expect(stats.longCount).toBeLessThanOrEqual(10);
    const byDocument = new Map<string, number>();
    for (const [index, item] of questions.entries()) {
      const { path } = item.document;
      expect(item.id.startsWith(seedV2 + ':')).toBe(true);
      expect(holdouts.has(path)).toBe(false);
      byDocument.set(path, (byDocument.get(path) ?? 0) + 1);
      const gap = Math.abs(item.a.images.length - item.b.images.length);
      expect(Math.max(item.a.images.length, item.b.images.length)).toBeLessThanOrEqual(6);
      expect(gap).toBeLessThanOrEqual(2);
      if (item.repeatOf) {
        const original = questions.findIndex(q => q.id === item.repeatOf);
        expect(original).toBeGreaterThanOrEqual(0);
        expect(index - original - 1).toBeGreaterThanOrEqual(8);
        expect(gap).toBeLessThanOrEqual(1);
      }
    }
    expect(Math.max(...byDocument.values())).toBeLessThanOrEqual(3);
  });

  it('reports a smaller feasible plan without calling it ready', () => {
    const { ready, stats } = planPilotV2({ datasetId: 'test', documents: [
      document('a', [2, 2, 3, 4]),
      document('singleton', [3])
    ] });
    expect(ready).toBe(false);
    expect(stats.singleLayouts).toBe(1);
    expect(stats.total).toBe(3);
    expect(stats.repeats).toBe(0);
  });
});
