/**
 * 腾讯新闻适配器
 *
 * ⚠️ 原样搬迁自 extractor.unlisted.ts，不改任何逻辑
 */
import type { SiteAdapter } from '../../types';

const qqNewsSelectors = [
  '.txp_video_container', '.video-container', '.video_function',
  '.function_bar', '.barrage_area', '[class*="player_"]',
  '.relative-wrap', '.feed-card', '.hot-news', '.author-articles',
  '.original-card', '.copyright-card', '.copyright', '.cmt_wrap',
  '#comment', '.footer', 'footer', '.bottom-bar',
  '[class*="recommend"]', '[class*="related"]', '[class*="hot-"]',
  '.J-FontSet', '.like-button', '.action-bar', '.function-button',
  '.feedback', '.download-app', '.hot-app', '.qr_code_pc', '#js_pc_qr_code',
  '[class*="ai-assistant"]', '[class*="yuanbao"]', '[class*="ai-bot"]',
  '[class*="share"]', '[class*="qrcode"]', '[data-boss*="share"]',
  '.sidebar', '.ad_area', '[class^="ad-"]', '[class*=" ad-"]',
];

export const qqNewsAdapter: SiteAdapter = {
  id: 'qq-news',
  match: (url: string) => url.includes('news.qq.com') || url.includes('new.qq.com'),
  siteName: '腾讯新闻',

  removeSelectors: qqNewsSelectors,

  preprocess(doc: Document) {
    // 智能处理 iframe：只删除明确的广告 iframe，保留可能的嵌入内容
    const mainContent = doc.querySelector('article, main, [role="main"], .content-article');
    doc.querySelectorAll('iframe').forEach((iframe) => {
      const src = iframe.src || '';
      // 已知广告域名列表
      const adDomains = ['doubleclick', 'googlesyndication', 'taboola', 'outbrain',
                         'adservice', 'adsense', 'adnxs', 'pubmatic', 'criteo'];
      const isAdIframe = adDomains.some(domain => src.includes(domain)) ||
                         (!src && !iframe.srcdoc); // 无 src 且无 srcdoc 的空 iframe

      if (mainContent) {
        // 如果找到了正文区域，只删除正文外的 iframe 或明确的广告 iframe
        if (!mainContent.contains(iframe) || isAdIframe) {
          iframe.remove();
        }
      } else {
        // 如果没找到正文区域，只删除明确的广告 iframe，保留其他 iframe
        if (isAdIframe) {
          iframe.remove();
        }
      }
    });
  },
};
