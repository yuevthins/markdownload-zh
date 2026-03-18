/**
 * 国际技术社区/博客适配器集合
 *
 * 原样搬迁自 extractor.unlisted.ts 的选择器配置
 */
import type { SiteAdapter } from '../../types';
import { createTechBlogAdapter, createSimpleAdapter } from '../helpers';

export const mediumAdapter = createTechBlogAdapter({
  id: 'medium',
  match: 'medium.com',
  siteName: 'Medium',
  removeSelectors: [
    '.metabar', '.postMeterBar', '.highlightMenu',
    '[class*="responsesWrapper"]', '[class*="followButton"]',
    '[class*="membership"]', '[class*="dialog"]',
  ],
  fallbackSelectors: ['article', '.section-content', '[class*="postArticle"]'],
});

export const devtoAdapter = createTechBlogAdapter({
  id: 'devto',
  match: 'dev.to',
  siteName: 'DEV Community',
  removeSelectors: [
    '.side-bar', '#comments', '.reactions-container',
    '.article-actions', '.author-details',
    '.reading-list-button', '.follow-action-button',
  ],
  fallbackSelectors: ['.crayons-article__main', '#article-body', '.article-body'],
});

export const hnAdapter = createSimpleAdapter({
  id: 'hacker-news',
  match: 'news.ycombinator.com',
  siteName: 'Hacker News',
  removeSelectors: [
    '.comment-tree', '.fatitem .votelinks', '.navs',
    '#hnmain > tbody > tr:last-child',
  ],
});

export const stackoverflowAdapter = createSimpleAdapter({
  id: 'stackoverflow',
  match: (url: string) => url.includes('stackoverflow.com') || url.includes('stackexchange.com'),
  siteName: 'Stack Overflow',
  removeSelectors: [
    '.sidebar', '.js-sidebar', '.related',
    '.post-menu', '.votecell', '#hot-network-questions',
  ],
  fallbackSelectors: ['.question', '.post-text', '.postcell'],
});

export const githubAdapter = createSimpleAdapter({
  id: 'github',
  match: 'github.com',
  siteName: 'GitHub',
  removeSelectors: [
    '.sidebar', '.discussion-sidebar', '.timeline-comment-actions',
    '.comment-reactions', '.social-count', '[class*="advertisement"]',
  ],
  fallbackSelectors: ['.markdown-body', '.readme-content', '.Box-body'],
});

export const gitlabAdapter = createSimpleAdapter({
  id: 'gitlab',
  match: 'gitlab.com',
  siteName: 'GitLab',
  removeSelectors: [
    '.right-sidebar', '.note-actions', '.awards-block',
    '.issuable-sidebar', '[class*="ad-"]',
  ],
});

export const hashnodeAdapter = createTechBlogAdapter({
  id: 'hashnode',
  match: (url: string) => url.includes('hashnode.dev') || url.includes('hashnode.com'),
  siteName: 'Hashnode',
  removeSelectors: [
    '.comment-section', '.reactions',
    '.author-card',
    '.ad', '.ads', '[class^="ad-"]', '[class*=" ad-"]', '[class*="advert"]',
  ],
  fallbackSelectors: ['.blog-content', '.article-content', 'article'],
});

export const fccAdapter = createTechBlogAdapter({
  id: 'freecodecamp',
  match: 'freecodecamp.org',
  siteName: 'freeCodeCamp',
  removeSelectors: [
    '#comment-section', '.donation-banner',
    '.author-card',
  ],
  fallbackSelectors: ['.post-content', '.post-full-content', 'article'],
});

export const csstricksAdapter = createTechBlogAdapter({
  id: 'css-tricks',
  match: 'css-tricks.com',
  siteName: 'CSS-Tricks',
  removeSelectors: [
    '#comments',
    '.author-box', '.newsletter-form',
  ],
  fallbackSelectors: ['.article-content', '.entry-content', 'article'],
});

export const smashingAdapter = createTechBlogAdapter({
  id: 'smashing',
  match: 'smashingmagazine.com',
  siteName: 'Smashing Magazine',
  removeSelectors: [
    '#comments', '.author--card',
    '.share--article',
  ],
  fallbackSelectors: ['.article__content', '.c-garfield-the-cat', 'article'],
});

export const digitaloceanAdapter = createTechBlogAdapter({
  id: 'digitalocean',
  match: 'digitalocean.com/community',
  siteName: 'DigitalOcean',
  removeSelectors: [
    '.comments-section', '.tutorial-sidebar',
    '.author-info',
    '.ad', '.ads', '[class^="ad-"]', '[class*=" ad-"]', '[class*="advert"]',
  ],
  fallbackSelectors: ['.DigitalOceanContent', '.content-body', 'article'],
});

export const logrocketAdapter = createTechBlogAdapter({
  id: 'logrocket',
  match: 'blog.logrocket.com',
  siteName: 'LogRocket Blog',
  removeSelectors: [
    '#comments', '.author-box',
  ],
});

/**
 * 所有技术博客适配器
 */
export const techBlogAdapters: SiteAdapter[] = [
  mediumAdapter, devtoAdapter, hnAdapter, stackoverflowAdapter,
  githubAdapter, gitlabAdapter, hashnodeAdapter, fccAdapter,
  csstricksAdapter, smashingAdapter, digitaloceanAdapter, logrocketAdapter,
];
