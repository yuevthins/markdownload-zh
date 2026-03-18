/**
 * Markdown 后处理清理
 */
import { removeZeroWidthChars } from '@/utils/text-cleanup';

/**
 * 清理并格式化 Markdown
 * - 移除零宽字符
 * - 压缩连续空行
 */
export function cleanupMarkdown(markdown: string): string {
  let result = removeZeroWidthChars(markdown);
  // 压缩连续空行（最多保留 2 个换行）
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}
