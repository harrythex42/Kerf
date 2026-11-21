# Optimal pagination

Global optimal pagination is the default for the browser and Playwright. Use `strategy: 'greedy-scored'` to opt into the greedy planner. In the
browser pass `optimal` alongside the strategy. In Playwright put numeric
options in `config.optimal`. Function-valued options run in the browser.
For custom JavaScript in Playwright, use the existing trusted strategy script
option to construct `new BreakFlow.OptimalStrategy(options)` in that browser.

For page height H, reserve 4 CSS pixels by default. Measure a representative
body paragraph's line height L in the print layout. For a page using h pixels,
r = (H − h) / L. The default whitespace function is
min(1,000,000, 1.18 ^ max(0, r − 2) − 1). Every page pays this function at
15 lines, about 7.60 units. Only non-final pages pay it on their remaining
space. The free allowance absorbs small gaps. Exponential growth favors
distributing substantial gaps across pages. The cap bounds very short blocks'
costs even in small type. These parameters are aesthetic choices.

Options include freeLines, growth, cap, fixedLines, reservePx, keepHeadings,
whitespaceCost(lines), and breakPenalty(left, right). The latter defaults to
zero. Infinity forbids that boundary. Costs must be nonnegative. Heading and
keep-with-next boundaries are protected. If protection conflicts with page
height or forced breaks, minimize the number of protections relaxed first.
The report lists each relaxed boundary. Oversized non-table blocks use the original
greedy splitter in isolation. Its fragments form fixed page units; the
optimality claim applies to the given measurable blocks and these fixed units.
An unsplittable object taller than a physical page remains an overflow error
in acceptance.

For each prefix ending at j, try each feasible last-page start i. Add the
last page's cost and the cost of its ending boundary to the best result for
prefix i. Apply the final-page discount only when j is the document end.
Every feasible partition has one such last page, and replacing its prefix by
a better one preserves feasibility. Induction from the empty prefix proves
optimality. Store predecessor indices to reconstruct the chosen pages.
Time is O(nk), where k is the largest number of blocks fitting on a page.
Auxiliary storage is O(n). The exhaustive oracle checks all cut masks for
300 seeded documents. The performance test measures planning on 5,000
already measured blocks and excludes browser layout and PDF export.

Run `pnpm acceptance` to produce both versions. Open
`output/acceptance/report.md` for the metrics and
`output/acceptance/comparison.html` for paired page images.


## Tables

A direct table in the printable flow contributes one unit per data row. A
page interval pays for the header again when it starts inside a table. Each
interior table cut pays `whitespaceCost(tableSplitLines)`. The default of 15
uses the same charge as one extra page. Both costs can be tuned independently.
`minTableRows` defaults to 2 and applies to every partial fragment, including
the final fragment. A whole short table is always legal. Rowspans prohibit
breaks through the spanning cell, including rowSpan=0 within its row group.
A marked keep-together table stays intact if it fits a fresh page. Repeated
headers come from the source thead or leading all-th rows. A source without
column labels has no labels to repeat. Captions and totals appear once.

Candidate-page validity and height depend only on the starting and ending
unit. This preserves the prefix optimality proof. Compare candidates first
by the number of short fragments in oversized tables, then by relaxed
keep-with-next boundaries, then by total numeric cost. A short fragment of a
table that fits a fresh page is forbidden. A heading, immediately preceding
paragraph or marked introduction stays with the start of its table. If one
indivisible row (or rowspan group) plus the header is taller than a page,
the planner reports that no legal layout exists. It never clips that row.

The table oracle independently enumerates every cut mask of 350 small random
documents with two tables, varying headers, row heights, split charges and
minimum row counts. Acceptance compares the printed data cells to the input
in source order and verifies each repeated header at the exact beginning of
its PDF page. It deliberately removes a header and moves half a data row to
the next page, then restores the rendered nodes.
