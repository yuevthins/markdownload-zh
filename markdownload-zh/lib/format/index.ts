/**
 * Stage 4: Markdown 后处理
 */
import { cleanupMarkdown } from './cleanup';

/**
 * 格式化 Markdown
 */
export function formatMarkdown(markdown: string): string {
  return cleanupMarkdown(markdown);
}
