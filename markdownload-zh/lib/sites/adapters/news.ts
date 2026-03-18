/**
 * 新闻站点适配器集合
 *
 * 原样搬迁自 extractor.unlisted.ts 的选择器配置
 * 使用 createNewsAdapter 工厂函数共享基础选择器
 */
import type { SiteAdapter } from '../../types';
import { createNewsAdapter } from '../helpers';

// ========================================
// 中文新闻/内容平台
// ========================================

export const doubanAdapter = createNewsAdapter({
  id: 'douban',
  match: 'douban.com',
  siteName: '豆瓣',
  removeSelectors: [
    '.aside', '#comments-section', '.recommendations',
    '.sns-bar', '.note-author', '.note-like',
  ],
  fallbackSelectors: ['.note-content', '.review-content', '#link-report'],
});

export const sspaiAdapter = createNewsAdapter({
  id: 'sspai',
  match: 'sspai.com',
  siteName: '少数派',
  removeSelectors: [
    '.comment-section', '.related-articles',
    '.author-box', '.share-buttons', '.membership',
  ],
  fallbackSelectors: ['.article-content', '.notion-page', '.content'],
});

export const kr36Adapter = createNewsAdapter({
  id: '36kr',
  match: '36kr.com',
  siteName: '36氪',
  removeSelectors: [
    '.article-bottom-module', '.comment-area',
    '.recommend-flow', '.author-widget', '.share-box',
    '.article-widget', '.kr-ad',
  ],
  fallbackSelectors: ['.article-content', '.articleDetailContent', '.common-width'],
});

export const huxiuAdapter = createNewsAdapter({
  id: 'huxiu',
  match: 'huxiu.com',
  siteName: '虎嗅',
  removeSelectors: [
    '.article-sidebar', '.comment-wrapper', '.related-article',
    '.author-info', '.share-module', '.ad-wrapper',
  ],
  fallbackSelectors: ['.article__content', '.article-content', '.content'],
});

export const tmtpostAdapter = createNewsAdapter({
  id: 'tmtpost',
  match: 'tmtpost.com',
  siteName: '钛媒体',
  removeSelectors: [
    '.post-sidebar', '.comment-box', '.recommend-posts',
    '.author-box', '.share-box', '.ad-box',
  ],
  fallbackSelectors: ['.post-content', '.article-content', '.content'],
});

export const ifanrAdapter = createNewsAdapter({
  id: 'ifanr',
  match: 'ifanr.com',
  siteName: '爱范儿',
  removeSelectors: [
    '.comment-section', '.related-posts',
    '.author-info', '.share-buttons', '.ad-container',
  ],
  fallbackSelectors: [],
});

export const toutiaoAdapter = createNewsAdapter({
  id: 'toutiao',
  match: 'toutiao.com',
  siteName: '今日头条',
  removeSelectors: [
    '.comment-container', '.related-article',
    '.author-info', '.share-module',
    '.feed-card', '.recommend-card',
  ],
  fallbackSelectors: ['.article-content', '.content', 'article'],
});

export const baijiahaoAdapter = createNewsAdapter({
  id: 'baijiahao',
  match: 'baijiahao.baidu.com',
  siteName: '百度百家号',
  removeSelectors: [
    '.aside', '.comment-module', '.recommend-container',
    '.author-info', '.share-module', '.ad-container',
  ],
  fallbackSelectors: ['.article-content', '.index-module_articleWrap_2Zphx', '.content'],
});

export const neteaseAdapter = createNewsAdapter({
  id: 'netease',
  match: '163.com',
  siteName: '网易',
  removeSelectors: [
    '.side', '.comment_area', '.related_news',
    '.author_box', '.share_box',
    '.recommend_wrap', '.post_footer',
    '.ad', '.ads', '[class^="ad-"]', '[class*=" ad-"]', '[class*="advert"]',
    '[id*="google_ads"]', '[class*="sponsored"]',
  ],
  fallbackSelectors: ['.post_body', '.post_text', '.content'],
});

export const sinaAdapter = createNewsAdapter({
  id: 'sina',
  match: (url: string) => url.includes('sina.com.cn') || url.includes('weibo.com'),
  siteName: '新浪',
  removeSelectors: [
    '.side', '#commentModule', '.recommend_wrap',
    '.article-info', '.share-wrap',
  ],
  fallbackSelectors: ['.article', '.article-content', '#artibody'],
});

export const ifengAdapter = createNewsAdapter({
  id: 'ifeng',
  match: 'ifeng.com',
  siteName: '凤凰网',
  removeSelectors: [
    '.aside', '.comment_box', '.relate_news',
    '.author_info', '.share_box', '.ad_container',
  ],
  fallbackSelectors: ['.text-3w', '.main_content', '#main_content'],
});

export const thepaperAdapter = createNewsAdapter({
  id: 'thepaper',
  match: 'thepaper.cn',
  siteName: '澎湃新闻',
  removeSelectors: [
    '.aside', '.comment_container', '.relate_box',
    '.author_box', '.share_box', '.ad_box',
  ],
  fallbackSelectors: ['.index_cententWrap__Jv8jk', '.news_txt', '.content'],
});

export const sohuAdapter = createNewsAdapter({
  id: 'sohu',
  match: 'sohu.com',
  siteName: '搜狐',
  removeSelectors: [
    '.right-side', '#commentModule', '.relate-news',
    '.article-info-wrap', '.share-wrap',
  ],
  fallbackSelectors: ['.article', '.article-content', '#mp-editor'],
});

export const msnAdapter = createNewsAdapter({
  id: 'msn',
  match: (url: string) => url.includes('msn.cn') || url.includes('msn.com'),
  siteName: 'MSN',
  removeSelectors: [
    '.adunit', '.native-ad', '.related-stories',
    '.more-stories', '.gallery-slide-ads',
  ],
});

// ========================================
// 国际新闻媒体
// ========================================

export const bbcAdapter: SiteAdapter = {
  id: 'bbc',
  match: (url: string) => url.includes('bbc.com') || url.includes('bbc.co.uk'),
  siteName: 'BBC',
  removeSelectors: [
    '[data-testid*="sidebar"]',
    '[class*="PromoList"]', '[class*="CommentCount"]', '[class*="ShareButtons"]',
    '[class^="ad-"]', '[class*=" ad-"]',
    'nav:not([aria-label*="Breadcrumb"])',
  ],
  preprocess(doc: Document) {
    // 智能处理 aside：只删除正文外的 aside，保留正文内的内容框
    const bbcMainContent = doc.querySelector('article, main, [role="main"]');
    doc.querySelectorAll('aside, [role="complementary"]').forEach((el) => {
      if (!bbcMainContent?.contains(el)) {
        el.remove();
      }
    });
  },
  fallbackSelectors: ['article', '[class*="ArticleBody"]', '.ssrcss-pv1rh6-ArticleWrapper'],
};

export const cnnAdapter = createNewsAdapter({
  id: 'cnn',
  match: 'cnn.com',
  siteName: 'CNN',
  removeSelectors: [
    '.el__article--embed', '.cn-zite-breakout-container',
    '.share-bar', '.related-content',
  ],
  fallbackSelectors: ['.article__content', '.zn-body__paragraph', 'article'],
});

export const vergeAdapter = createNewsAdapter({
  id: 'verge',
  match: 'theverge.com',
  siteName: 'The Verge',
  removeSelectors: [
    '.author-info', '.share-buttons',
    '.related-stories', '.recommended',
  ],
  fallbackSelectors: ['.article-body', '.c-entry-content', 'article'],
});

export const techcrunchAdapter = createNewsAdapter({
  id: 'techcrunch',
  match: 'techcrunch.com',
  siteName: 'TechCrunch',
  removeSelectors: [
    '#comments', '.author-card',
    '.share-buttons',
    '.related-articles', '.recommended',
  ],
  fallbackSelectors: ['.article-content', '.article__content', 'article'],
});

export const arsAdapter = createNewsAdapter({
  id: 'ars',
  match: 'arstechnica.com',
  siteName: 'Ars Technica',
  removeSelectors: [
    '#comments', '.author-info',
    '.share-buttons', '.related-stories',
  ],
  fallbackSelectors: ['.article-content', '.article-guts', 'article'],
});

export const wiredAdapter = createNewsAdapter({
  id: 'wired',
  match: 'wired.com',
  siteName: 'Wired',
  removeSelectors: [
    '#comments', '.author-bio',
    '.social-icons',
    '.related-stories', '.recommendations',
  ],
  fallbackSelectors: ['.article__body', '.article-body-component', 'article'],
});

export const guardianAdapter = createNewsAdapter({
  id: 'guardian',
  match: 'theguardian.com',
  siteName: 'The Guardian',
  removeSelectors: [
    '#comments', '.author-info',
    '.share-buttons', '.related-content',
    '.submeta', '.content-footer',
  ],
  fallbackSelectors: ['.article-body-commercial-selector', '.content__article-body', 'article'],
});

export const nytAdapter = createNewsAdapter({
  id: 'nyt',
  match: 'nytimes.com',
  siteName: 'New York Times',
  removeSelectors: [
    '#commentsContainer', '.author-info',
    '.share-tools', '.related-coverage',
    '.story-footer', '.recommendations',
  ],
  fallbackSelectors: ['article', '.StoryBodyCompanionColumn', '[class*="ArticleBody"]'],
});

export const wapoAdapter = createNewsAdapter({
  id: 'wapo',
  match: 'washingtonpost.com',
  siteName: 'Washington Post',
  removeSelectors: [
    '#comments', '.author-bio',
    '.share-buttons', '.related-links',
  ],
  fallbackSelectors: [],
});

export const reutersAdapter = createNewsAdapter({
  id: 'reuters',
  match: 'reuters.com',
  siteName: 'Reuters',
  removeSelectors: [
    '#comments', '.author-info',
    '.share-buttons', '.related-content',
  ],
  fallbackSelectors: ['article', '.article-body', '[class*="ArticleBody"]'],
});

export const bloombergAdapter = createNewsAdapter({
  id: 'bloomberg',
  match: 'bloomberg.com',
  siteName: 'Bloomberg',
  removeSelectors: [
    '.right-rail', '#comments', '.author-bio',
    '.share-buttons', '.related-articles',
  ],
  fallbackSelectors: ['article', '.body-content', '[class*="article-body"]'],
});

export const forbesAdapter = createNewsAdapter({
  id: 'forbes',
  match: 'forbes.com',
  siteName: 'Forbes',
  removeSelectors: [
    '#comments', '.author-info',
    '.share-buttons', '.related-content',
    '.promoted-stories', '.trending-stories',
  ],
  fallbackSelectors: ['.article-body', '.body-container', 'article'],
});

/**
 * 所有新闻站点适配器
 */
export const newsAdapters: SiteAdapter[] = [
  // 中文
  doubanAdapter, sspaiAdapter, kr36Adapter, huxiuAdapter,
  tmtpostAdapter, ifanrAdapter, toutiaoAdapter, baijiahaoAdapter,
  neteaseAdapter, sinaAdapter, ifengAdapter, thepaperAdapter,
  sohuAdapter, msnAdapter,
  // 国际
  bbcAdapter, cnnAdapter, vergeAdapter, techcrunchAdapter,
  arsAdapter, wiredAdapter, guardianAdapter, nytAdapter,
  wapoAdapter, reutersAdapter, bloombergAdapter, forbesAdapter,
];
