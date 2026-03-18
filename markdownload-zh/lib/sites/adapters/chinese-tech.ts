/**
 * 中文技术社区适配器集合
 *
 * 原样搬迁自 extractor.unlisted.ts 的选择器配置
 */
import type { SiteAdapter } from '../../types';
import { createSimpleAdapter } from '../helpers';
import { safeRemoveElements } from '../../preprocess/dom-utils';

export const juejinAdapter: SiteAdapter = {
  id: 'juejin',
  match: 'juejin.cn',
  siteName: '掘金',
  removeSelectors: [
    '.sidebar', '.article-suspended-panel', '.recommended-area',
    '.comment-box', '.tag-list-box', '.author-info-box',
    '.related-entry', '.article-end', '.extension',
    '.creation-ad', '.banner-ad', '.advert',
  ],
  fallbackSelectors: ['.article-content', '.markdown-body', '#article-root'],
};

export const cnblogsAdapter: SiteAdapter = {
  id: 'cnblogs',
  match: 'cnblogs.com',
  siteName: '博客园',
  removeSelectors: [
    '#sideBar', '#sidebar', '.sidebar',
    '#comment_form', '#comment_form_container', '.commentform',
    '#comments', '.comment_area', '#divCommentShow',
    '#footer', '#navigator', '.blogStats',
    '#cnblogs_ad_cmt_top', '#cnblogs_ad_t2', '#cnblogs_ad_under_post_comment',
    '#green_channel', '.postDesc', '#div_digg',
    '#profile_block', '#leftcontentcontainer',
    '.postCate', '.postTags',
  ],
  fallbackSelectors: ['#cnblogs_post_body', '.post-body', '.blogpost-body', '#post_detail'],
};

export const jianshuAdapter: SiteAdapter = {
  id: 'jianshu',
  match: 'jianshu.com',
  siteName: '简书',
  removeSelectors: [
    '[data-component="aside"]', '[data-component="sidebar"]',
    '.note-comment', '.follow-detail', '.follow-button',
    '[class*="recommend"]', '[class*="Recommend"]',
    '[class*="sidebar"]', '[class*="Sidebar"]',
    '[class*="comment"]', '[class*="Comment"]',
    'aside',
  ],
  fallbackSelectors: ['article', '.ouvJEz', '._2rhmJa'],
};

export const oschinaAdapter = createSimpleAdapter({
  id: 'oschina',
  match: 'oschina.net',
  siteName: '开源中国',
  removeSelectors: [
    '.ad-wrap', '.recommend-box', '.article-box__meta',
    '#commentForm', '.comment-list', '.sidebar',
    '.related-news', '.hot-article', '.ad-item',
  ],
  fallbackSelectors: ['.article-detail', '.content', '.article-box__content'],
});

export const segmentfaultAdapter = createSimpleAdapter({
  id: 'segmentfault',
  match: 'segmentfault.com',
  siteName: 'SegmentFault',
  removeSelectors: [
    '.side-bar', '.comment-box', '.article-stream-card',
    '.article__bottom', '.article__author', '.widget-box',
    '.recommend-card', '.share-widget', '.collect-btn',
  ],
  fallbackSelectors: ['.article__content', '.fmt', '.article-content'],
});

export const cto51Adapter = createSimpleAdapter({
  id: '51cto',
  match: '51cto.com',
  siteName: '51CTO',
  removeSelectors: [
    '.sidebar', '.article-bottom', '.comment-area',
    '.recommend-article', '.hot-article', '.ad-box',
    '.share-box', '.author-box', '.tag-list',
  ],
  fallbackSelectors: ['.article-content', '.art-content', '.main-content'],
});

export const infoqCnAdapter = createSimpleAdapter({
  id: 'infoq-cn',
  match: 'infoq.cn',
  siteName: 'InfoQ 中文',
  removeSelectors: [
    '.article-sidebar', '.comment-section', '.recommend-articles',
    '.author-info', '.article-tags', '.share-buttons',
    '.membership-prompt', '.newsletter-signup',
  ],
  fallbackSelectors: ['.article-content', '.article-preview', '.content'],
});

export const v2exAdapter: SiteAdapter = {
  id: 'v2ex',
  match: 'v2ex.com',
  siteName: 'V2EX',
  removeSelectors: [
    '#Rightbar', '.dock_area', '#Bottom',
    '#reply-box',
  ],
  preprocess(doc: Document) {
    // :has() 选择器单独处理，某些浏览器不支持
    safeRemoveElements(doc, ['.cell:has(.reply_content)']);
  },
  fallbackSelectors: ['.topic_content', '.cell', '#Main'],
};

export const leetcodeCnAdapter = createSimpleAdapter({
  id: 'leetcode-cn',
  match: 'leetcode.cn',
  siteName: 'LeetCode 中文',
  removeSelectors: [
    '.side-tools-wrapper', '.discuss-container', '.submission-list',
    '[class*="ads"]', '[class*="subscription"]',
  ],
});

export const aliyunDevAdapter = createSimpleAdapter({
  id: 'aliyun-dev',
  match: 'developer.aliyun.com',
  siteName: '阿里云开发者社区',
  removeSelectors: [
    '.aside', '.comment-area', '.recommend-list',
    '.author-card', '.share-area', '.ad-container',
  ],
});

export const tencentCloudAdapter = createSimpleAdapter({
  id: 'tencent-cloud',
  match: 'cloud.tencent.com/developer',
  siteName: '腾讯云开发者社区',
  removeSelectors: [
    '.com-side-bar', '.com-comment', '.com-recommend',
    '.author-info', '.share-bar', '.ad-box',
  ],
});

export const yuqueAdapter = createSimpleAdapter({
  id: 'yuque',
  match: 'yuque.com',
  siteName: '语雀',
  removeSelectors: [
    '.sidebar', '.comment-section', '.catalog-container',
    '.author-info', '.share-buttons', '[class*="ad"]',
  ],
  fallbackSelectors: ['.yuque-doc-content', '.lake-content', 'article'],
});

export const feishuAdapter = createSimpleAdapter({
  id: 'feishu',
  match: 'feishu.cn',
  siteName: '飞书文档',
  removeSelectors: [
    '.sidebar', '.comment-panel', '.doc-header-bar',
    '.share-menu', '[class*="ad"]',
  ],
  fallbackSelectors: ['.docx-content', '.doc-content', 'article'],
});

/**
 * 所有中文技术社区适配器
 */
export const chineseTechAdapters: SiteAdapter[] = [
  juejinAdapter,
  cnblogsAdapter,
  jianshuAdapter,
  oschinaAdapter,
  segmentfaultAdapter,
  cto51Adapter,
  infoqCnAdapter,
  v2exAdapter,
  leetcodeCnAdapter,
  aliyunDevAdapter,
  tencentCloudAdapter,
  yuqueAdapter,
  feishuAdapter,
];
