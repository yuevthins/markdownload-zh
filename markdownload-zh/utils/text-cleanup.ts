/**
 * 文本清理工具
 */

/**
 * 零宽字符正则
 * - U+200B: Zero Width Space
 * - U+200C: Zero Width Non-Joiner
 * - U+200D: Zero Width Joiner
 * - U+FEFF: BOM / Zero Width No-Break Space
 */
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF]/g;

/**
 * 移除零宽字符
 */
export function removeZeroWidthChars(text: string): string {
  return text.replace(ZERO_WIDTH_CHARS, '');
}

/**
 * 通用占位符 alt 文本（需要被替换的）
 */
const PLACEHOLDER_ALTS = ['图片', 'image', 'img', 'photo', '图', ''];

/**
 * 判断是否为占位符 alt
 */
export function isPlaceholderAlt(alt: string | null): boolean {
  if (!alt) return true;
  const normalized = alt.trim().toLowerCase();
  return PLACEHOLDER_ALTS.includes(normalized);
}
