/**
 * 微信公众号适配器
 *
 * ⚠️ 原样搬迁自 extractor.unlisted.ts，不改任何逻辑
 */
import type { SiteAdapter } from '../../types';

export const wechatAdapter: SiteAdapter = {
  id: 'wechat',
  match: 'mp.weixin.qq.com',
  siteName: '微信公众号',

  removeSelectors: [
    '#js_pc_qr_code', '#js_share_area', '.qr_code_pc',
    'iframe', '.rich_media_tool', '.rich_media_meta_list',
  ],

  preprocess(doc: Document) {
    // 微信公众号图片 style 属性干扰显示
    doc.querySelectorAll('img').forEach((img) => img.removeAttribute('style'));
  },

  fallbackSelectors: ['#js_content', '.rich_media_content', '#js_article'],
};
