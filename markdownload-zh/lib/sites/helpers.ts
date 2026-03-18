/**
 * 适配器工厂函数
 */
import type { SiteAdapter } from '../types';

/**
 * 新闻站点基础移除选择器
 */
const NEWS_BASE_SELECTORS = [
  'nav', '.navigation', '.sidebar', '.related-articles',
  '.comments', '.social-share', '[class*="ad-"]', '.newsletter-signup',
];

/**
 * 技术博客基础移除选择器
 */
const TECH_BLOG_BASE_SELECTORS = [
  '.sidebar', '.comments', '.author-card', '.share-buttons',
  '[class*="ad-"]', '.newsletter', '.related-posts',
];

/**
 * 创建新闻站点适配器
 */
export function createNewsAdapter(
  config: Partial<SiteAdapter> & { id: string; match: SiteAdapter['match'] }
): SiteAdapter {
  return {
    ...config,
    removeSelectors: [...NEWS_BASE_SELECTORS, ...(config.removeSelectors ?? [])],
  };
}

/**
 * 创建技术博客适配器
 */
export function createTechBlogAdapter(
  config: Partial<SiteAdapter> & { id: string; match: SiteAdapter['match'] }
): SiteAdapter {
  return {
    ...config,
    removeSelectors: [...TECH_BLOG_BASE_SELECTORS, ...(config.removeSelectors ?? [])],
  };
}

/**
 * 创建简单适配器（仅选择器）
 */
export function createSimpleAdapter(
  config: Partial<SiteAdapter> & { id: string; match: SiteAdapter['match'] }
): SiteAdapter {
  return {
    removeSelectors: [],
    ...config,
  };
}
