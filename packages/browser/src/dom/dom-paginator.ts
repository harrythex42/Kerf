import type { PaginationPlan, ResolvedPageConfig } from '@breakflow/core';

export function constructPaginatedDOM(
  sandboxRoot: HTMLElement,
  plan: PaginationPlan,
  pageConfig: ResolvedPageConfig,
  doc: Document
): HTMLElement {
  const outputContainer = doc.createElement('div');
  outputContainer.className = 'breakflow-paginated-root';

  for (const pageInfo of plan.pages) {
    const pageEl = doc.createElement('div');
    pageEl.className = 'breakflow-page';
    pageEl.setAttribute('data-page-number', String(pageInfo.pageNumber));
    pageEl.style.width = pageConfig.width;
    pageEl.style.height = pageConfig.height;
    pageEl.style.boxSizing = 'border-box';

    const contentEl = doc.createElement('div');
    contentEl.className = 'breakflow-page-content';
    contentEl.setAttribute('data-page-content', String(pageInfo.pageNumber));
    contentEl.style.boxSizing = 'border-box';
    contentEl.style.paddingTop = pageConfig.margin.top;
    contentEl.style.paddingRight = pageConfig.margin.right;
    contentEl.style.paddingBottom = pageConfig.margin.bottom;
    contentEl.style.paddingLeft = pageConfig.margin.left;

    // Recreate the source scope so inherited styles and selectors such as #report > p match.
    let contentTarget: HTMLElement = contentEl;
    if (sandboxRoot.tagName.toLowerCase() !== 'body') {
      contentTarget = sandboxRoot.cloneNode(false) as HTMLElement;
      contentTarget.style.marginBlock = '0';
      contentTarget.style.paddingBlock = '0';
      contentTarget.style.minHeight = '0';
      contentTarget.style.height = 'auto';
      contentTarget.style.maxHeight = 'none';
      contentEl.appendChild(contentTarget);
    }

    // A continuation starts at the printable edge. The measured gap before
    // its first block belonged to the preceding page's last block.
    contentTarget.setAttribute('data-breakflow-page-root', '');
    for (const item of pageInfo.items) {
      const sourceEl = sandboxRoot.querySelector(`[data-breakflow-node-id="${item.nodeId}"]`) as HTMLElement | null;
      if (!sourceEl) continue;

      if (item.tableSplit?.isSplit) {
        // Construct table slice
        const tableSlice = createTableSlice(sourceEl as HTMLTableElement, item.tableSplit, doc);
        contentTarget.appendChild(tableSlice);
      } else {
        const clonedNode = sourceEl.cloneNode(true) as HTMLElement;
        contentTarget.appendChild(clonedNode);
      }
    }

    pageEl.appendChild(contentEl);
    outputContainer.appendChild(pageEl);
  }

  return outputContainer;
}

function createTableSlice(
  originalTable: HTMLTableElement,
  tableSplit: { startRowIndex: number; endRowIndex: number; repeatsHeader: boolean },
  doc: Document
): HTMLElement {
  const tableClone = originalTable.cloneNode(false) as HTMLTableElement;
  tableClone.classList.add('breakflow-table-slice');
  const { startRowIndex, endRowIndex } = tableSplit;
  const bodies = Array.from(originalTable.tBodies);
  const dataRows = bodies.flatMap(body => Array.from(body.rows)).filter(row => row.hasAttribute('data-breakflow-row-index'));
  const final = endRowIndex + 1 === dataRows.length;
  tableClone.style.width = originalTable.getBoundingClientRect().width + 'px';
  tableClone.style.maxWidth = '100%';
  if (!final) tableClone.style.marginBlockEnd = '0';
  if (originalTable.caption && ((getComputedStyle(originalTable.caption).captionSide === 'bottom') ? final : startRowIndex === 0)) {
    tableClone.append(originalTable.caption.cloneNode(true));
  }

  // Freeze the measured column tracks so multiline cells wrap as in the source.
  const rows = Array.from(originalTable.rows);
  const columnCount = rows.reduce((n, row) => Math.max(n, Array.from(row.cells).reduce((k, c) => k + c.colSpan, 0)), 0);
  const full = rows.find(row => row.cells.length === columnCount);
  if (full) {
    tableClone.style.tableLayout = 'fixed';
    const cols = doc.createElement('colgroup');
    const total = Array.from(full.cells).reduce((sum, cell) => sum + cell.getBoundingClientRect().width, 0);
    for (const cell of Array.from(full.cells)) {
      const col = doc.createElement('col');
      col.style.width = 100 * cell.getBoundingClientRect().width / total + '%';
      cols.append(col);
    }
    tableClone.append(cols);
  } else {
    for (const cols of originalTable.querySelectorAll(':scope > colgroup')) tableClone.append(cols.cloneNode(true));
  }

  if (originalTable.tHead && (startRowIndex === 0 || tableSplit.repeatsHeader)) {
    tableClone.append(originalTable.tHead.cloneNode(true));
  }
  for (const body of bodies) {
    const copy = body.cloneNode(false) as HTMLTableSectionElement;
    for (const row of Array.from(body.rows)) {
      const index = row.dataset.breakflowRowIndex;
      if (index !== undefined && +index >= startRowIndex && +index <= endRowIndex) copy.append(row.cloneNode(true));
    }
    if (copy.rows.length) tableClone.append(copy);
  }
  if (final && originalTable.tFoot) tableClone.append(originalTable.tFoot.cloneNode(true));
  return tableClone;
}
