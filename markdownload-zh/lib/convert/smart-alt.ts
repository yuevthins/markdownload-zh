/**
 * 智能图片 alt 文本提取
 *
 * 从 extractor.unlisted.ts getSmartAlt() 原样迁移
 */
import { isPlaceholderAlt } from '@/utils/text-cleanup';

/**
 * 清理 alt 文本：剥离换行、转义 Markdown 图片语法中的特殊字符 [ ]
 */
function sanitizeAlt(text: string): string {
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .trim();
}

/**
 * 智能提取图片 alt 文本
 */
export function getSmartAlt(img: HTMLImageElement): string {
  let raw = '';

  // 1. 原有 alt（如果有意义）
  const originalAlt = img.getAttribute('alt');
  if (originalAlt && !isPlaceholderAlt(originalAlt)) {
    raw = originalAlt;
  }

  // 2. data-alt
  if (!raw) {
    const dataAlt = img.getAttribute('data-alt');
    if (dataAlt && dataAlt.trim()) raw = dataAlt.trim();
  }

  // 3. title
  if (!raw) {
    const title = img.getAttribute('title');
    if (title && title.trim()) raw = title.trim();
  }

  // 4. aria-label
  if (!raw) {
    const ariaLabel = img.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) raw = ariaLabel.trim();
  }

  // 5. figcaption（如果在 figure 中）
  if (!raw) {
    const figure = img.closest('figure');
    if (figure) {
      const figcaption = figure.querySelector('figcaption');
      if (figcaption && figcaption.textContent) {
        const captionText = figcaption.textContent.trim();
        if (captionText.length > 0 && captionText.length <= 100) {
          raw = captionText;
        }
      }
    }
  }

  // 统一清理：剥离换行 + 转义 Markdown 图片语法特殊字符
  return raw ? sanitizeAlt(raw) : '';
}
