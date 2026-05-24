/**
 * X/Twitter 站点适配器
 *
 * 区分 Article（长文）和 Tweet（短推文/Thread）两种模式：
 * - Article: 只取第一个 <article>，移除评论和 UI 噪音
 * - Tweet: 保留多条 tweet 提取（最多 8 条）
 *
 * 共享逻辑：站内链接转纯文本、翻译检测警告
 */
import type { SiteAdapter } from '../../types';

const NOISE_SELECTORS = [
  'nav',
  'aside',
  '[role="navigation"]',
  '[role="complementary"]',
  '[role="group"]',
  '[data-testid="sidebarColumn"]',
  '[data-testid="DMDrawer"]',
  '[data-testid="BottomBar"]',
  '[data-testid="trend"]',
  '[data-testid="placementTracking"]',
  '[data-testid="reply"]',
  '[data-testid="retweet"]',
  '[data-testid="like"]',
  '[data-testid="caret"]',
  '[aria-label*="Who to follow"]',
  '[aria-label*="Timeline: Trending"]',
  '[href*="/analytics"]',
  '[href*="/quotes"]',
  'script',
  'style',
  'noscript',
];

function text(el: Element | null | undefined): string {
  return el?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function isArticleMode(url: string, doc: Document): boolean {
  if (url.includes('/article/')) return true;
  // Check if first article has long-form indicators
  const first = doc.querySelector('article');
  if (!first) return false;
  const headings = first.querySelectorAll('h2, h3');
  return headings.length >= 2 && text(first).length > 800;
}

function isTranslated(doc: Document): boolean {
  const html = doc.documentElement;
  return (
    html.classList.contains('translated-ltr') ||
    html.classList.contains('translated-rtl') ||
    [...html.classList].some((c) => c.startsWith('translated'))
  );
}

/**
 * 站内链接转纯文本，外部链接保留
 */
function cleanLinks(root: HTMLElement): void {
  const anchors = [...root.querySelectorAll<HTMLAnchorElement>('a[href]')];
  for (const a of anchors) {
    const href = a.getAttribute('href') || '';
    const isInternal =
      href.startsWith('/') ||
      href.includes('x.com') ||
      href.includes('twitter.com');
    if (isInternal) {
      const span = a.ownerDocument.createElement('span');
      span.textContent = a.textContent || '';
      a.replaceWith(span);
    }
  }
}

/**
 * 移除 UI 噪音元素
 */
function removeNoise(root: HTMLElement): void {
  root.querySelectorAll(NOISE_SELECTORS.join(', ')).forEach((el) => el.remove());
  root.querySelectorAll('[hidden], [aria-hidden="true"]').forEach((el) => el.remove());
  // Remove premium/subscribe CTAs
  root.querySelectorAll('a, button, div').forEach((el) => {
    const t = text(el);
    if (
      t.length < 50 &&
      (/premium/i.test(t) || /升级/i.test(t) || /subscribe/i.test(t) || /订阅/i.test(t))
    ) {
      el.remove();
    }
  });
}

/**
 * 移除作者头部冗余块，返回作者名
 */
function extractAuthor(article: HTMLElement): string {
  const userNameEl = article.querySelector('[data-testid="User-Name"]');
  if (!userNameEl) return '';
  const author = text(userNameEl.querySelector('span'));
  userNameEl.remove();
  return author;
}

function extractArticle(doc: Document): { title: string; content: string } | null {
  const firstArticle = doc.querySelector<HTMLElement>('article');
  if (!firstArticle || text(firstArticle).length < 100) return null;

  const clone = firstArticle.cloneNode(true) as HTMLElement;
  const author = extractAuthor(clone);
  removeNoise(clone);
  cleanLinks(clone);

  const title =
    doc.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content?.trim() ||
    text(doc.querySelector('h1')) ||
    'X Article';

  const root = doc.createElement('article');
  if (author) {
    const byline = doc.createElement('p');
    byline.textContent = `Author: ${author}`;
    root.appendChild(byline);
  }
  root.appendChild(clone);

  return { title, content: root.innerHTML };
}

function extractTweets(doc: Document): { title: string; content: string } | null {
  const articles = [...doc.querySelectorAll<HTMLElement>('article[data-testid="tweet"], article')]
    .filter((a) => text(a.querySelector('[data-testid="tweetText"]')) || text(a).length > 40)
    .slice(0, 8);

  if (articles.length === 0) return null;

  const title =
    doc.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content?.trim() ||
    text(doc.querySelector('h1')) ||
    doc.title.replace(/\s+[-|].+$/, '').trim() ||
    'X / Twitter Post';

  const root = doc.createElement('article');
  const h1 = doc.createElement('h1');
  h1.textContent = title;
  root.appendChild(h1);

  for (const article of articles) {
    const clone = article.cloneNode(true) as HTMLElement;
    extractAuthor(clone); // remove redundant avatar blocks
    removeNoise(clone);
    cleanLinks(clone);
    root.appendChild(clone);
  }

  return { title, content: root.innerHTML };
}

function customExtract(doc: Document, url: string): { title: string; content: string } | null {
  const articleMode = isArticleMode(url, doc);
  let result = articleMode ? extractArticle(doc) : null;

  // Fallback: if Article mode fails, try Tweet mode
  if (!result) result = extractTweets(doc);
  if (!result) return null;

  // Translation warning
  if (isTranslated(doc)) {
    result.content =
      '<blockquote>⚠️ 此页面在剪藏时处于浏览器翻译状态，内容可能包含机翻痕迹。</blockquote>' +
      result.content;
  }

  return result;
}

export const twitterAdapter: SiteAdapter = {
  id: 'x-twitter',
  match: (url: string) => url.includes('x.com/') || url.includes('twitter.com/'),
  siteName: 'X / Twitter',
  customExtract,
};
