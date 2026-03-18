/**
 * Stage 1: DOM 预处理
 */
import type { SiteAdapter } from '../types';
import { preprocessLazyImages } from './lazy-images';
import { normalizeTables } from './tables';
import { removeVideoPlayers } from './video-players';

/**
 * 通用清理选择器（所有站点）
 */
const UNIVERSAL_REMOVE_SELECTORS = [
  // 广告相关（这些选择器通常很安全）
  '[id*="google_ads"]', '[class*="google-ad"]', '[class*="GoogleAd"]',
  '[id*="taboola"]', '[id*="outbrain"]', '[class*="sponsored-content"]',
  // 社交分享按钮
  '.addthis_toolbox', '.shareaholic',
  // Cookie 通知（使用更精确的选择器）
  '[class*="cookie-banner"]', '[class*="cookie-consent"]',
  '[id*="cookie-notice"]', '[id*="gdpr-banner"]',
];

/**
 * 预处理 DOM（Stage 1）
 *
 * 执行顺序：
 * 1. 通用懒加载图片处理
 * 2. 通用视频播放器过滤
 * 3. 通用表格预处理
 * 4. 站点特定的 removeSelectors
 * 5. 站点特定的 preprocess 钩子
 * 6. 通用清理
 *
 * 每个阶段失败不中断整个管线
 */
export async function preprocessDOM(
  doc: Document,
  url: string,
  adapter: SiteAdapter | null
): Promise<void> {
  const baseUrl = url;

  // 1. 通用懒加载处理
  try {
    preprocessLazyImages(doc, baseUrl);
  } catch (e) {
    console.warn('[Markdownload] preprocessLazyImages failed:', e);
  }

  // 2. 通用视频播放器过滤
  try {
    removeVideoPlayers(doc);
  } catch (e) {
    console.warn('[Markdownload] removeVideoPlayers failed:', e);
  }

  // 3. 通用表格预处理
  try {
    normalizeTables(doc);
  } catch (e) {
    console.warn('[Markdownload] normalizeTables failed:', e);
  }

  // 4. 站点特定的 removeSelectors
  if (adapter?.removeSelectors && adapter.removeSelectors.length > 0) {
    try {
      doc.querySelectorAll(adapter.removeSelectors.join(', ')).forEach((el) => el.remove());
    } catch (e) {
      console.warn('[Markdownload] removeSelectors failed:', e);
    }
  }

  // 5. 站点特定的 preprocess 钩子
  if (adapter?.preprocess) {
    try {
      await adapter.preprocess(doc, url);
    } catch (e) {
      console.warn('[Markdownload] adapter.preprocess failed:', e);
    }
  }

  // 6. 通用清理
  try {
    const mainContent = doc.querySelector('article, main, [role="main"], .article-content, .post-content');
    doc.querySelectorAll(UNIVERSAL_REMOVE_SELECTORS.join(', ')).forEach((el) => {
      // 如果元素在正文区域内，不要删除
      if (mainContent && mainContent.contains(el)) {
        if (el.tagName === 'IFRAME' && (el as HTMLIFrameElement).src?.includes('ads')) {
          el.remove();
        }
      } else {
        el.remove();
      }
    });
  } catch (e) {
    console.warn('[Markdownload] universal cleanup failed:', e);
  }
}
