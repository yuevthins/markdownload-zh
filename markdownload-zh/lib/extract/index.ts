/**
 * Stage 2: 内容提取
 *
 * 优先级：
 * 1. 适配器自定义提取 (customExtract) — 内部把 HTML 转为 Markdown
 * 2. defuddle —— 直接产出 Markdown
 * 3. 后备提取器 — 内部把 HTML 转为 Markdown
 *
 * 所有路径统一返回 Markdown，pipeline 不再需要单独的 convert 阶段。
 */
import type { SiteAdapter } from '../types';
import { defuddleExtract, htmlToMarkdown } from './defuddle';
import { getFallbackContent, getSiteName } from './fallback';

export interface ExtractResult {
  title: string;
  markdown: string;
  siteName?: string;
}

/**
 * 提取内容（Stage 2）
 */
export async function extractContent(
  doc: Document,
  url: string,
  adapter: SiteAdapter | null,
  sourceDoc?: Document
): Promise<ExtractResult | null> {
  // 1. 适配器自定义提取（HTML → defuddle htmlToMarkdown）
  if (adapter?.customExtract) {
    try {
      const docForExtract = adapter.needsSourceDoc ? sourceDoc : undefined;
      const result = await adapter.customExtract(doc, url, docForExtract);
      if (result) {
        return {
          title: result.title,
          markdown: htmlToMarkdown(result.content, url),
          siteName: adapter.siteName || getSiteName(doc, url),
        };
      }
    } catch (e) {
      console.warn('[Markdownload] customExtract failed, falling through:', e);
    }
  }

  // 2. defuddle —— 通用提取 + Markdown 转换
  const contentSelector = adapter?.fallbackSelectors?.[0];
  const defuddled = defuddleExtract(doc, url, { contentSelector });
  if (defuddled) {
    return {
      title: defuddled.title || doc.title || 'Untitled',
      markdown: defuddled.markdown,
      siteName: adapter?.siteName || defuddled.siteName || getSiteName(doc, url),
    };
  }

  // 3. 后备提取器（仍走 DOM 选择器找内容，再 htmlToMarkdown）
  const fallback = getFallbackContent(doc, url, adapter);
  if (fallback) {
    return {
      title: fallback.title,
      markdown: htmlToMarkdown(fallback.html, url),
      siteName: fallback.siteName,
    };
  }

  return null;
}
