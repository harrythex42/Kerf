export const baseline = { freeLines: 2, growth: 1.18, cap: 1e6, fixedLines: 15,
  tableSplitLines: 15, reservePx: 4, minTableRows: 2, keepHeadings: true };

export const nearbyValues = {
  freeLines: [0, 1, 3, 5, 7],
  growth: [1.08, 1.12, 1.15, 1.21, 1.25, 1.30],
  fixedLines: [8, 11, 13, 18, 21, 25],
  tableSplitLines: [6, 9, 12, 18, 22, 28]
};

export const nearbyProfiles = [baseline, ...Object.entries(nearbyValues)
  .flatMap(([key, values]) => values.map(value => ({ ...baseline, [key]: value })))];
