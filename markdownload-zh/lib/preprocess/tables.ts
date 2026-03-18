/** 表格硬上限：超过此行/列/单元格数时跳过 rowspan 展开，只做基础清理 */
const MAX_ROWS = 500;
const MAX_COLS = 50;
const MAX_CELLS = 10_000;

/**
 * 通用表格预处理器
 *
 * 处理策略：
 * 1. 移除所有干扰属性（table 及子元素）
 * 2. 移除 colgroup/col（Markdown 不需要）
 * 3. 展开 rowspan（复制内容到后续行，避免信息丢失）
 * 4. 移除 colspan（Markdown 不支持列合并）
 * 5. 清理单元格内的复杂嵌套结构
 *
 * 超大表格（超过硬上限）跳过 rowspan 展开，只做基础属性清理。
 */
export function normalizeTables(doc: Document): void {
  doc.querySelectorAll('table').forEach((table) => {
    // 1. 清理 table 元素自身的所有属性
    Array.from(table.attributes).forEach((attr) => table.removeAttribute(attr.name));

    // 2. 移除 colgroup/col（对 Markdown 无意义）
    table.querySelectorAll('colgroup').forEach((el) => el.remove());

    // 3. 清理所有子元素的属性（先保留 rowspan/colspan 用于展开）
    const allTableElements = table.querySelectorAll('thead, tbody, tfoot, tr, th, td');
    allTableElements.forEach((el) => {
      const rowspan = el.getAttribute('rowspan');
      const colspan = el.getAttribute('colspan');
      Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));
      if (rowspan) el.setAttribute('rowspan', rowspan);
      if (colspan) el.setAttribute('colspan', colspan);
    });

    // 4. 展开 rowspan（复制内容到后续行）
    // 硬上限检查：超大表格跳过 rowspan 展开
    const rows = Array.from(table.rows);
    const firstRowCells = rows[0]?.cells.length || 0;
    const totalCells = rows.length * Math.max(firstRowCells, 1);

    if (rows.length > MAX_ROWS || firstRowCells > MAX_COLS || totalCells > MAX_CELLS) {
      console.warn(
        `[Markdownload] 表格过大 (${rows.length}×${firstRowCells}=${totalCells} cells)，跳过 rowspan 展开`
      );
      // 只移除 rowspan/colspan 属性，不做展开
      table.querySelectorAll('[rowspan], [colspan]').forEach((el) => {
        el.removeAttribute('rowspan');
        el.removeAttribute('colspan');
      });
      return; // 跳过后续的 rowspan 展开和单元格清理
    }

    const grid: (Element | null)[][] = []; // 虚拟网格跟踪占位

    rows.forEach((row, rowIdx) => {
      if (!grid[rowIdx]) grid[rowIdx] = [];

      const cells = Array.from((row as HTMLTableRowElement).cells);
      let cellIdx = 0;
      let gridCol = 0;

      while (cellIdx < cells.length || grid[rowIdx][gridCol]) {
        // 跳过被 rowspan 占用的位置
        while (grid[rowIdx][gridCol]) {
          gridCol++;
        }

        if (cellIdx >= cells.length) break;

        const cell = cells[cellIdx];
        const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
        const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);

        // 在网格中标记占位
        for (let r = 0; r < rowspan; r++) {
          for (let c = 0; c < colspan; c++) {
            if (!grid[rowIdx + r]) grid[rowIdx + r] = [];
            if (r === 0 && c === 0) {
              grid[rowIdx + r][gridCol + c] = cell;
            } else {
              grid[rowIdx + r][gridCol + c] = cell; // 标记为被占用
              // 对于 rowspan > 1 的情况，在后续行插入重复单元格
              if (r > 0 && c === 0) {
                const newCell = doc.createElement(cell.tagName.toLowerCase());
                newCell.textContent = cell.textContent; // 复制内容
                // 找到正确的插入位置
                const targetRow = rows[rowIdx + r] as HTMLTableRowElement | undefined;
                if (targetRow) {
                  const targetCells = Array.from(targetRow.cells);
                  let insertBefore: Element | null = null;
                  let currentCol = 0;
                  for (const tc of targetCells) {
                    if (currentCol >= gridCol) {
                      insertBefore = tc;
                      break;
                    }
                    currentCol++;
                  }
                  if (insertBefore) {
                    targetRow.insertBefore(newCell, insertBefore);
                  } else {
                    targetRow.appendChild(newCell);
                  }
                }
              }
            }
          }
        }

        // 移除 rowspan/colspan 属性
        cell.removeAttribute('rowspan');
        cell.removeAttribute('colspan');

        gridCol += colspan;
        cellIdx++;
      }
    });

    // 5. 确保表格有表头（GFM 要求）
    // 如果没有 thead，将第一行的 td 转换为 th 并包装在 thead 中
    if (!table.querySelector('thead')) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        // 将 td 转换为 th（使用 DOM 方法移动子节点）
        firstRow.querySelectorAll('td').forEach((td) => {
          const th = doc.createElement('th');
          while (td.firstChild) {
            th.appendChild(td.firstChild);
          }
          td.replaceWith(th);
        });
        // 创建 thead 并移动第一行
        const thead = doc.createElement('thead');
        thead.appendChild(firstRow);
        // 确保 tbody 存在并在 thead 之后
        let tbody = table.querySelector('tbody');
        if (!tbody) {
          tbody = doc.createElement('tbody');
          // 移动剩余的 tr 到 tbody
          table.querySelectorAll('tr').forEach((tr) => tbody!.appendChild(tr));
        }
        table.insertBefore(thead, table.firstChild);
        if (!table.contains(tbody)) {
          table.appendChild(tbody);
        }
      }
    }

    // 6. 清理单元格内容
    table.querySelectorAll('th, td').forEach((cell) => {
      // a. Slate.js 编辑器等复杂结构 → 提取纯文本
      const slateEditor = cell.querySelector('[data-slate-editor="true"]');
      if (slateEditor) {
        const text = (slateEditor as HTMLElement).innerText || slateEditor.textContent || '';
        while (cell.firstChild) cell.removeChild(cell.firstChild);
        const lines = text.trim().split('\n');
        lines.forEach((line, idx) => {
          if (idx > 0) cell.appendChild(doc.createElement('br'));
          cell.appendChild(doc.createTextNode(line));
        });
        return;
      }

      // b. 块级元素扁平化
      const blocks = cell.querySelectorAll('div, p');
      blocks.forEach((block, idx) => {
        if (idx > 0 && block.parentNode === cell) {
          cell.insertBefore(doc.createElement('br'), block);
        }
        while (block.firstChild) {
          block.parentNode?.insertBefore(block.firstChild, block);
        }
        block.remove();
      });

      // c. 移除 span 包装
      cell.querySelectorAll('span').forEach((span) => {
        while (span.firstChild) {
          span.parentNode?.insertBefore(span.firstChild, span);
        }
        span.remove();
      });
    });
  });
}
