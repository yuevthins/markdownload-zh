/**
 * 简单站点适配器（知识/文档平台）
 *
 * 原样搬迁自 extractor.unlisted.ts 的选择器配置
 */
import type { SiteAdapter } from '../../types';
import { createSimpleAdapter } from '../helpers';

export const wikipediaAdapter = createSimpleAdapter({
  id: 'wikipedia',
  match: 'wikipedia.org',
  siteName: 'Wikipedia',
  removeSelectors: [
    '#mw-navigation', '#mw-panel', '.navbox',
    '.reflist', '#catlinks', '.sistersitebox',
    '.hatnote', '.ambox', '.metadata',
  ],
  fallbackSelectors: ['#mw-content-text', '.mw-parser-output', '#content'],
});

export const mdnAdapter = createSimpleAdapter({
  id: 'mdn',
  match: 'developer.mozilla.org',
  siteName: 'MDN Web Docs',
  removeSelectors: [
    '.sidebar', '.bc-table', '.newsletter-box',
    '[class*="ad-"]', '.document-footer',
  ],
  fallbackSelectors: ['.main-page-content', '.article', '#content'],
});

export const w3schoolsAdapter = createSimpleAdapter({
  id: 'w3schools',
  match: 'w3schools.com',
  siteName: 'W3Schools',
  removeSelectors: [
    '#leftmenuinnerinner', '#right', '.adunit',
    '#footer', '.nextprev',
  ],
  fallbackSelectors: ['#main', '.w3-main', '.mainLe498'],
});

export const quoraAdapter = createSimpleAdapter({
  id: 'quora',
  match: 'quora.com',
  siteName: 'Quora',
  removeSelectors: [
    '.sidebar', '.AnswerFooter', '.RelatedQuestions',
    '.FollowButton', '.ShareMenu',
    '.ad', '.ads', '[class^="ad-"]', '[class*=" ad-"]', '[class*="advert"]',
    '[class*="sponsored"]',
  ],
  fallbackSelectors: ['.AnswerBase', '.q-box', '.Answer'],
});

export const substackAdapter = createSimpleAdapter({
  id: 'substack',
  match: 'substack.com',
  siteName: 'Substack',
  removeSelectors: [
    '.sidebar', '.comment-section', '.subscribe-widget',
    '.author-info', '.share-buttons', '.related-posts',
  ],
  fallbackSelectors: ['.post-content', '.body', 'article'],
});

export const notionAdapter = createSimpleAdapter({
  id: 'notion',
  match: (url: string) => url.includes('notion.site') || url.includes('notion.so'),
  siteName: 'Notion',
  removeSelectors: [
    '.notion-sidebar', '.notion-page-controls',
    '[class*="breadcrumb"]', '[class*="topbar"]',
  ],
  fallbackSelectors: ['.notion-page-content', '.notion-app-inner', 'article'],
});

/**
 * 所有简单站点适配器
 */
export const simpleAdapters: SiteAdapter[] = [
  wikipediaAdapter, mdnAdapter, w3schoolsAdapter,
  quoraAdapter, substackAdapter, notionAdapter,
];
