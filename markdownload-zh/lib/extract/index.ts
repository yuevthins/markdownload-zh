/**
 * Stage 2: 内容提取
 */
import type { SiteAdapter } from '../types';
import { readabilityExtract } from './readability';
import { getFallbackContent, getSiteName } from './fallback';

/**
 * 提取内容（Stage 2）
 *
 * 优先级：
 * 1. 适配器自定义提取 (customExtract)
 * 2. Readability
 * 3. 后备提取器
 */
export async function extractContent(
  doc: Document,
  url: string,
  adapter: SiteAdapter | null,
  sourceDoc?: Document
): Promise<{ title: string; html: string; siteName?: string } | null> {
  // 1. 适配器自定义提取
  if (adapter?.customExtract) {
    try {
      // 需要 Shadow DOM 访问的适配器传入原始文档
      const docForExtract = adapter.needsSourceDoc ? sourceDoc : undefined;
      const result = await adapter.customExtract(doc, url, docForExtract);
      if (result) {
        return {
          title: result.title,
          html: result.content,
          siteName: adapter.siteName || getSiteName(doc, url),
        };
      }
    } catch (e) {
      console.warn('[Markdownload] customExtract failed, falling through:', e);
    }
  }

  // 2. Readability
  const article = readabilityExtract(doc);
  if (article) {
    return {
      title: article.title || doc.title || 'Untitled',
      html: article.content,
      siteName: adapter?.siteName || article.siteName || getSiteName(doc, url),
    };
  }

  // 3. 后备提取器
  const fallback = getFallbackContent(doc, url, adapter);
  if (fallback) {
    return fallback;
  }

  return null;
}
