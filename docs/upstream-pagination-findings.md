# Pagination findings for BreakFlow 0.1.2

Observed on commit [55136a9](https://github.com/mehmetduran932/BreakFlow/tree/55136a9bbef4f50fb63398008dd12be34c1206b3)
using the Chromium PDF adapter. These are local issue drafts.

## Direct text in a pagination root is dropped

Render `<main id="report">Before <em>inline emphasis</em><p>Inside</p>After</main>`
with `generatePdf({ html, selector: '#report' })`. The output should contain
`Before inline emphasis Inside After` in order. BreakFlow 0.1.2 only measures
`rootElement.children`, so it omits the `Before` and `After` text nodes.
Wrap contiguous inline content in measurable blocks in the temporary clone.
See [root-text.html](../samples/root-text.html).

## Reconstructed pages lose root-scoped CSS

Render a root like
`<main id="report" class="report-scope"><h2>Heading</h2><p>Body</p></main>`
with `#report.report-scope > h2 { font-size: 42px }` and
`.report-scope { font-size: 19px }`. The sandbox measures the heading at 42 px
and the paragraph at 19 px. The printed subtree drops the report root, so the
direct-child selector and inherited root style both stop applying. Recreate
the source root within each page. The print page continues to control its
vertical margins. See [root-font-size.html](../samples/root-font-size.html).

## Reaching a pagination limit can produce a partial PDF

Render [block-limit.html](../samples/block-limit.html) with the default
configuration and `selector: '#report'`. All 501 tiny blocks fit on one page.
The greedy loop reaches its default limit of 500 iterations. It reports an
overflow issue but returns a partial plan, which the adapter writes as a PDF
containing the first 500 blocks. The same pattern applies to the page limit.
Reject the operation before printing whenever a limit prevents a complete plan.
