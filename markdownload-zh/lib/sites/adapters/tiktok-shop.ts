/**
 * TikTok Shop 适配器
 *
 * ⚠️ 原样搬迁自 extractor.unlisted.ts，不改任何逻辑
 */
import type { SiteAdapter } from '../../types';
import { mergeSplitLinks, normalizeTikTokTables, replaceTikTokImagePlaceholders } from '../../preprocess/links';

const tiktokSelectors = [
  '[class*="breadcrumb"]', '[class*="Breadcrumb"]',
  '[class*="sidebar"]', '[class*="Sidebar"]',
  '[class*="side-nav"]', '[class*="SideNav"]',
  '[class*="pagination"]', '[class*="Pagination"]',
  '[class*="feedback"]', '[class*="Feedback"]',
  '[class*="helpful"]', '[class*="Helpful"]',
  '[class*="rating"]', '[class*="Rating"]',
  '[class*="vote"]', '[class*="Vote"]',
  '[class*="next-article"]', '[class*="prev-article"]',
  '[class*="NextPrev"]', '[class*="article-nav"]',
  '[class*="ArticleNav"]', '[class*="page-nav"]',
  '[class*="PageNav"]', '[class*="related-article"]',
  '[class*="RelatedArticle"]',
  'nav', 'header', '[role="navigation"]', '[role="banner"]',
  '[class*="menu"]:not(article [class*="menu"])',
  '[class*="Menu"]:not(article [class*="Menu"])',
  '[class*="academy-header"]', '[class*="Academy-header"]',
];

export const tiktokShopAdapter: SiteAdapter = {
  id: 'tiktok-shop',
  match: (url: string) =>
    url.includes('seller.tiktokshopglobalselling.com') ||
    url.includes('seller.tiktokglobalshop.com'),
  siteName: 'TikTok Shop',

  removeSelectors: tiktokSelectors,

  preprocess(doc: Document) {
    mergeSplitLinks(doc);
    normalizeTikTokTables(doc);
    replaceTikTokImagePlaceholders(doc);
  },
};
