import { describe, expect, it } from 'vitest';
import { buildPilot, holdouts, pilotDifference } from '../../scripts/review/pilot.mjs';

function pair(documentPath: string, index: number, category = '报告') {
  const id = `${documentPath}:${index}`;
  const variant = (side: string, pages: number, split: number) => ({
    id: `${id}:${side}`, images: Array(pages).fill('page'),
    options: { freeLines: 2, growth: 1.18, fixedLines: 15, tableSplitLines: split },
    costs: { pages: [{ tableSlices: [] }] }
  });
  return {
    id, document: { path: documentPath, category },
    a: variant('a', 2, 15), b: variant('b', index % 2 ? 2 : 3, 20)
  };
}

describe('pagination pilot', () => {
  it('keeps deterministic, spaced repeats and caps all questions, including repeats', () => {
    const candidates = Array.from({ length: 21 }, (_, i) =>
      Array.from({ length: 3 }, (_, j) => pair(`document-${i}`, j, i < 7 ? '长表格' : '报告'))
    ).flat().concat([...holdouts.keys()].map(path => pair(path, 0)));
    const questions = buildPilot(candidates);
    expect(questions.map(q => q.id)).toEqual(buildPilot([...candidates].reverse()).map(q => q.id));
    expect(questions).toHaveLength(40);
    expect(new Set(questions.map(q => q.id)).size).toBe(40);
    expect(questions.filter(q => q.repeatOf)).toHaveLength(6);
    expect(questions.filter(q => q.document.category === '长表格').length).toBeLessThanOrEqual(10);
    expect(new Set(questions.map(q => pilotDifference(q).samePages)).size).toBe(2);
    const counts = new Map<string, number>();
    for (const [index, q] of questions.entries()) {
      expect(holdouts.has(q.document.path)).toBe(false);
      counts.set(q.document.path, (counts.get(q.document.path) ?? 0) + 1);
      if (q.repeatOf) {
        const original = questions.findIndex(other => other.id === q.repeatOf);
        expect(original).toBeGreaterThanOrEqual(0);
        expect(index - original).toBeGreaterThan(8);
        expect(questions[original].originalPairId).toBe(q.originalPairId);
      }
    }
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3);
  });

  it('does not offer an incomplete pilot when the dataset is too small', () => {
    expect(buildPilot([pair('small', 0)])).toEqual([]);
  });
});
