/**
 * Discourse 论坛适配器
 *
 * Linux.do 这类 Discourse 主题页里，主帖、回复、相关主题都在同一页面。
 * Readability 偶尔能抽到主帖文本，但容易丢图片/代码或把论坛噪音带进去。
 */
import type { SiteAdapter } from '../../types';

const MAIN_POST_SELECTORS = [
  '#post_1 .post[itemprop="text"]',
  '#post_1 [itemprop="text"]',
  '#post_1 .regular.contents .cooked',
  '#post_1 .cooked',
  '[data-post-number="1"] .regular.contents .cooked',
  '[data-post-number="1"] .cooked',
  '.topic-post:first-of-type .regular.contents .cooked',
  '.topic-post:first-of-type .cooked',
  '.topic-body.crawler-post .post[itemprop="text"]',
];

const CONTENT_NOISE_SELECTORS = [
  '.crawler-post-meta',
  '.crawler-linkback-list',
  '.post-likes',
  '[itemprop="interactionStatistic"]',
  '.topic-meta-data',
  '.topic-avatar',
  '.post-menu-area',
  '.post-controls',
  '.actions',
  '.quote-controls',
  '.meta',
  'button',
  'script',
  'style',
  'noscript',
  'svg',
];

function getMetaContent(doc: Document, selector: string): string {
  return doc.querySelector<HTMLMetaElement>(selector)?.content?.trim() || '';
}

function getDiscourseTitle(doc: Document): string {
  return (
    getMetaContent(doc, 'meta[property="og:title"]') ||
    getMetaContent(doc, 'meta[name="twitter:title"]') ||
    doc.querySelector('#topic-title h1 a')?.textContent?.trim() ||
    doc.querySelector('.fancy-title')?.textContent?.trim() ||
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.title.replace(/\s+-\s+.+$/, '').trim() ||
    'Untitled'
  );
}

function isReplyPost(el: Element): boolean {
  const post = el.closest('.topic-body, .topic-post, article');
  return post?.getAttribute('itemprop') === 'comment';
}

function hasUsefulContent(el: Element): boolean {
  const textLength = el.textContent?.trim().length || 0;
  return textLength > 0 || el.querySelector('img, pre, code, video, iframe') !== null;
}

function findMainPostContent(doc: Document): HTMLElement | null {
  for (const selector of MAIN_POST_SELECTORS) {
    for (const el of doc.querySelectorAll<HTMLElement>(selector)) {
      if (isReplyPost(el)) continue;
      if (!hasUsefulContent(el)) continue;
      return el;
    }
  }

  return null;
}

function isImageLikeUrl(href: string, baseUrl: string): string {
  try {
    const url = new URL(href, baseUrl);
    const pathname = url.pathname.toLowerCase();
    if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(pathname)) {
      return url.href;
    }
  } catch {
    // 忽略非法 URL，保留原始 DOM。
  }
  return '';
}

function preferOriginalLightboxImages(root: HTMLElement, pageUrl: string): void {
  root.querySelectorAll<HTMLAnchorElement>('a.lightbox').forEach((anchor) => {
    const img = anchor.querySelector<HTMLImageElement>('img');
    if (!img) return;

    const originalUrl = isImageLikeUrl(anchor.getAttribute('href') || '', pageUrl);
    if (originalUrl) {
      img.setAttribute('src', originalUrl);
    }

    const title = anchor.getAttribute('title')?.trim();
    if (title && !img.getAttribute('alt')) {
      img.setAttribute('alt', title);
    }
  });
}

function cleanDiscourseContent(content: HTMLElement, pageUrl: string): HTMLElement {
  const clone = content.cloneNode(true) as HTMLElement;

  clone.querySelectorAll(CONTENT_NOISE_SELECTORS.join(', ')).forEach((el) => {
    el.remove();
  });
  preferOriginalLightboxImages(clone, pageUrl);

  return clone;
}

export function extractDiscourseMainPost(
  doc: Document,
  url: string
): { title: string; content: string } | null {
  const content = findMainPostContent(doc);
  if (!content) return null;

  const cleaned = cleanDiscourseContent(content, url);
  const html = cleaned.innerHTML.trim();
  if (!html) return null;

  return {
    title: getDiscourseTitle(doc),
    content: html,
  };
}

export const discourseAdapter: SiteAdapter = {
  id: 'discourse',
  match: (url: string) => {
    try {
      const { hostname } = new URL(url);
      return hostname === 'linux.do' || hostname.endsWith('.linux.do');
    } catch {
      return false;
    }
  },
  siteName: 'LINUX DO',
  customExtract(doc: Document, url: string) {
    return extractDiscourseMainPost(doc, url);
  },
};
