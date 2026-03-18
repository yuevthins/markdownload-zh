/**
 * Stage 3: HTML → Markdown
 */
import { getTurndownService, setBaseUrl } from './turndown-factory';

/**
 * 将 HTML 转换为 Markdown
 *
 * @param html 要转换的 HTML 字符串
 * @param baseUrl 页面 URL，用于懒加载图片的相对路径归一化
 */
export function convertToMarkdown(html: string, baseUrl?: string): string {
  if (baseUrl) {
    setBaseUrl(baseUrl);
  }
  const turndown = getTurndownService();
  return turndown.turndown(html);
}
