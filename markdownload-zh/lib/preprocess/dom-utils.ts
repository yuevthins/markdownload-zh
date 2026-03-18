/**
 * DOM 操作工具函数
 *
 * 从 extractor.unlisted.ts 原样迁移:
 * - safeQuerySelectorAll()
 * - safeRemoveElements()
 */

/**
 * 安全地执行 querySelectorAll，处理不支持的选择器（如 :has()）
 */
export function safeQuerySelectorAll(doc: Document, selectors: string[]): Element[] {
  const elements: Element[] = [];
  for (const selector of selectors) {
    try {
      doc.querySelectorAll(selector).forEach((el) => elements.push(el));
    } catch {
      // 选择器不支持（如某些浏览器不支持 :has()），静默跳过
      console.debug(`[Markdownload] Unsupported selector skipped: ${selector}`);
    }
  }
  return elements;
}

/**
 * 安全地移除元素，使用 safeQuerySelectorAll 处理可能不支持的选择器
 */
export function safeRemoveElements(doc: Document, selectors: string[]): void {
  safeQuerySelectorAll(doc, selectors).forEach((el) => el.remove());
}
