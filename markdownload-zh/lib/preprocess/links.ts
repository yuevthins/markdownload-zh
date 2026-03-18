/**
 * 链接处理预处理器
 *
 * 从 extractor.unlisted.ts 原样迁移:
 * - mergeSplitLinks()
 * - replaceTikTokImagePlaceholders()
 * - normalizeTikTokTables()
 * - createTableFromData()
 */

/**
 * 合并被拆分的链接
 * 某些站点（如 TikTok Shop）的链接文本被 <span> 标签切割，
 * 导致 Turndown 将每个 <a> 单独转换，产生 [Sho](url)[p](url) 这样的结果。
 * 此函数合并相邻的同 href 链接。
 */
export function mergeSplitLinks(doc: Document): void {
  // 处理所有链接
  const allLinks = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[];

  for (let i = 0; i < allLinks.length - 1; i++) {
    const current = allLinks[i];
    // 跳过已被移除的链接
    if (!current.parentElement) continue;

    const currentHref = current.getAttribute('href');
    if (!currentHref) continue;

    // 查找紧邻的下一个兄弟节点
    let nextNode = current.nextSibling;

    // 跳过空白文本节点
    while (nextNode && nextNode.nodeType === Node.TEXT_NODE && !nextNode.textContent?.trim()) {
      nextNode = nextNode.nextSibling;
    }

    // 检查是否是相同 href 的链接
    if (
      nextNode &&
      nextNode.nodeType === Node.ELEMENT_NODE &&
      (nextNode as Element).tagName === 'A'
    ) {
      const nextLink = nextNode as HTMLAnchorElement;
      const nextHref = nextLink.getAttribute('href');

      if (currentHref === nextHref) {
        // 合并文本内容到当前链接
        current.textContent = (current.textContent || '') + (nextLink.textContent || '');
        nextLink.remove();
        // 重新处理当前位置（可能还有更多相邻链接）
        i--;
      }
    }
  }
}

/** 判断 URL 是否为 TikTok CDN 图片 */
function isTikTokCdn(url: string): boolean {
  return url.includes('ibyteimg') || url.includes('tiktokcdn') || url.includes('bytedance');
}

/**
 * TikTok Shop 图片占位符处理
 * 某些 TikTok Shop 页面在表格中使用 "图示占位符" 文本，
 * 而实际图片可能在页面其他位置或未正确关联。
 * 此函数尝试从页面中收集所有内容图片并替换占位符。
 */
export function replaceTikTokImagePlaceholders(doc: Document): void {
  // 使用 Set 去重（O(1) 查找，替代 Array.includes 的 O(n)）
  const imageUrlSet = new Set<string>();

  // 单次遍历：合并 img src/data-*、background-image、懒加载属性的收集
  const lazyAttrs = ['data-src', 'data-original', 'data-lazy-src', 'data-bg'];
  const combinedSelector = [
    'img',
    '[style*="background"]',
    ...lazyAttrs.map((attr) => `[${attr}]`),
  ].join(', ');

  doc.querySelectorAll(combinedSelector).forEach((el) => {
    // img 标签：检查 src 和 data-src
    if (el.tagName === 'IMG') {
      const img = el as HTMLImageElement;
      const src = img.src || img.getAttribute('data-src') || '';
      if (src && isTikTokCdn(src)) {
        const width = img.width || parseInt(img.getAttribute('width') || '0', 10);
        const height = img.height || parseInt(img.getAttribute('height') || '0', 10);
        if (width === 0 || width > 50 || height === 0 || height > 50) {
          imageUrlSet.add(src);
        }
      }
    }

    // 背景图片
    const style = el.getAttribute('style') || '';
    if (style.includes('background')) {
      const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (match?.[1] && isTikTokCdn(match[1])) {
        imageUrlSet.add(match[1]);
      }
    }

    // 懒加载 data-* 属性
    for (const attr of lazyAttrs) {
      const url = el.getAttribute(attr);
      if (url && isTikTokCdn(url)) {
        imageUrlSet.add(url);
      }
    }
  });

  if (imageUrlSet.size === 0) {
    console.debug('[Markdownload] TikTok: 未找到内容图片');
    return;
  }

  const imageUrls = Array.from(imageUrlSet);
  console.debug(`[Markdownload] TikTok: 找到 ${imageUrls.length} 张内容图片`);

  // 查找并替换占位符文本
  // 使用 TreeWalker 遍历所有文本节点
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const text = node.textContent || '';
      if (text.includes('图示占位符') || text.includes('[图示占位符]')) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_REJECT;
    },
  });

  const placeholderNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    placeholderNodes.push(node);
  }

  console.debug(`[Markdownload] TikTok: 找到 ${placeholderNodes.length} 个图片占位符`);

  // 为每个占位符分配一张图片
  let imageIndex = 0;
  placeholderNodes.forEach((textNode) => {
    if (imageIndex >= imageUrls.length) return;

    const url = imageUrls[imageIndex];
    imageIndex++;

    // 创建 img 元素替换文本
    const img = doc.createElement('img');
    img.src = url;
    img.alt = '图片';

    // 替换占位符文本
    const parent = textNode.parentNode;
    if (parent) {
      // 如果文本节点只包含占位符，直接替换
      const text = textNode.textContent || '';
      if (text.trim() === '图示占位符' || text.trim() === '[图示占位符]') {
        parent.replaceChild(img, textNode);
      } else {
        // 如果占位符是文本的一部分，需要分割文本
        const before = text.substring(0, text.indexOf('图示占位符'));
        const after = text.substring(text.indexOf('图示占位符') + 5);

        const beforeNode = doc.createTextNode(before.replace('[', ''));
        const afterNode = doc.createTextNode(after.replace(']', ''));

        parent.insertBefore(beforeNode, textNode);
        parent.insertBefore(img, textNode);
        parent.insertBefore(afterNode, textNode);
        parent.removeChild(textNode);
      }
    }
  });

  console.debug(`[Markdownload] TikTok: 替换了 ${Math.min(imageIndex, placeholderNodes.length)} 个占位符`);
}

/**
 * 从 JSON 数据创建表格
 */
function createTableFromData(
  doc: Document,
  data: Array<Record<string, unknown>>
): HTMLTableElement | null {
  if (!Array.isArray(data) || data.length === 0) return null;

  const table = doc.createElement('table');
  const thead = doc.createElement('thead');
  const tbody = doc.createElement('tbody');

  // 从第一行获取列名
  const headers = Object.keys(data[0]);
  const headerRow = doc.createElement('tr');
  headers.forEach((header) => {
    const th = doc.createElement('th');
    th.textContent = String(header);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // 填充数据行
  data.forEach((row) => {
    const tr = doc.createElement('tr');
    headers.forEach((header) => {
      const td = doc.createElement('td');
      const value = row[header];
      td.textContent = value != null ? String(value) : '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

/**
 * TikTok Shop 表格增强处理
 * 该站点的表格可能使用复杂的 React 组件渲染，
 * 标准 normalizeTables() 可能无法完全处理。
 * 此函数提供额外的表格修复。
 */
export function normalizeTikTokTables(doc: Document): void {
  // 处理可能的 div 模拟表格（role="table"）
  doc.querySelectorAll('[role="table"]').forEach((tableDiv) => {
    const rows = tableDiv.querySelectorAll('[role="row"]');
    if (rows.length === 0) return;

    // 创建真实的 table 元素
    const table = doc.createElement('table');
    const tbody = doc.createElement('tbody');
    let isFirstRow = true;

    rows.forEach((row) => {
      const tr = doc.createElement('tr');
      const cells = row.querySelectorAll('[role="cell"], [role="columnheader"], [role="gridcell"]');

      cells.forEach((cell) => {
        const cellTag = isFirstRow ? 'th' : 'td';
        const td = doc.createElement(cellTag);
        // 提取文本内容，保留基本格式
        td.innerHTML = cell.innerHTML;
        tr.appendChild(td);
      });

      if (isFirstRow) {
        const thead = doc.createElement('thead');
        thead.appendChild(tr);
        table.appendChild(thead);
        isFirstRow = false;
      } else {
        tbody.appendChild(tr);
      }
    });

    if (tbody.children.length > 0) {
      table.appendChild(tbody);
    }

    // 用真实表格替换 div 模拟表格
    tableDiv.replaceWith(table);
  });

  // 处理可能被隐藏在 data-* 属性中的表格数据
  doc.querySelectorAll('[data-table], [data-content]').forEach((el) => {
    const dataTable = el.getAttribute('data-table');
    if (dataTable) {
      try {
        const tableData = JSON.parse(dataTable);
        if (Array.isArray(tableData) && tableData.length > 0) {
          const table = createTableFromData(doc, tableData);
          if (table) {
            el.appendChild(table);
          }
        }
      } catch {
        // JSON 解析失败，忽略
      }
    }
  });
}
