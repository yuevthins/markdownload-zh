/**
 * 后备内容提取器
 */
import type { SiteAdapter } from '../types';

/**
 * 通用后备选择器（适用于所有站点）
 */
const GENERIC_FALLBACK_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.content',
  '#content',
  '.post',
  '.article',
  '.rich_media_content',
  '#js_content',
  '.Post-RichText',
  '.RichContent-inner',
  '.articlecontent',
  '.article-body',
  '[data-testid="article-body"]',
  '.story-body',
  '[data-testid="post-container"]',
  '.Post',
  '#article_content',
];

/**
 * 获取站点名称
 */
function getSiteName(doc: Document, url: string): string {
  const ogSiteName = doc.querySelector('meta[property="og:site_name"]');
  if (ogSiteName) {
    const content = ogSiteName.getAttribute('content');
    if (content) return content;
  }

  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * 后备内容提取
 *
 * 当 Readability 失败时，使用适配器的 fallbackSelectors 或通用选择器提取内容。
 * 站点专用选择器已迁移到各适配器的 fallbackSelectors 字段。
 */
export function getFallbackContent(
  doc: Document,
  url: string,
  adapter: SiteAdapter | null
): { title: string; html: string; siteName?: string } | null {
  // Reddit 短帖子需要更低的阈值
  const isReddit = url.includes('reddit.com');
  const minContentLength = isReddit ? 20 : 100;
  const minFinalLength = isReddit ? 10 : 50;

  // 优先使用适配器的 fallbackSelectors
  if (adapter?.fallbackSelectors) {
    for (const sel of adapter.fallbackSelectors) {
      const el = doc.querySelector(sel);
      if (el && el.textContent && el.textContent.trim().length > minContentLength) {
        const title =
          doc.querySelector('h1')?.textContent?.trim() ||
          doc.querySelector('.blog-title')?.textContent?.trim() ||
          doc.querySelector('.title-article')?.textContent?.trim() ||
          doc.title ||
          'Untitled';
        return {
          title,
          html: el.innerHTML,
          siteName: adapter.siteName || getSiteName(doc, url),
        };
      }
    }
  }

  // 通用后备选择器
  let contentEl: Element | null = null;
  for (const sel of GENERIC_FALLBACK_SELECTORS) {
    contentEl = doc.querySelector(sel);
    if (
      contentEl &&
      contentEl.textContent &&
      contentEl.textContent.length > minContentLength
    ) {
      break;
    }
    contentEl = null;
  }

  if (!contentEl) {
    const body = doc.body.cloneNode(true) as HTMLElement;
    [
      'nav',
      'header',
      'footer',
      'aside',
      '.sidebar',
      '.nav',
      '.menu',
      '.comments',
      '.advertisement',
      '.ad',
      '[role="navigation"]',
      '[role="banner"]',
      '[role="complementary"]',
      'script',
      'style',
      'noscript',
    ].forEach((sel) => {
      body.querySelectorAll(sel).forEach((el) => el.remove());
    });
    contentEl = body;
  }

  if (
    !contentEl ||
    !contentEl.textContent ||
    contentEl.textContent.trim().length < minFinalLength
  ) {
    return null;
  }

  const title =
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.title ||
    'Untitled';

  return {
    title,
    html: contentEl.innerHTML,
    siteName: getSiteName(doc, url),
  };
}

export { getSiteName };
