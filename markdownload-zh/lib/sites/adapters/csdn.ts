/**
 * CSDN 适配器
 *
 * ⚠️ 原样搬迁自 extractor.unlisted.ts，不改任何逻辑
 */
import type { SiteAdapter } from '../../types';

export const csdnAdapter: SiteAdapter = {
  id: 'csdn',
  match: 'csdn.net',
  siteName: 'CSDN',

  removeSelectors: [
    '.toolbox-list', '.blog-footer-bottom', '.recommend-box',
    '#rightAs498498498', '.recommend-item-box', '.recommend-tit-box',
    '.article-copyright', '.hide-article-box',
    '#comment_area', '.comment-box', '#commentBox',
    '.csdn-side-toolbar', '.template-box', '.more-toolbox',
    '.article-info-box .article-tag-box',
    '.passport-login-container', '.login-box',
    '.toc-article', '.recommend-right', '.tool-container',
    '.article-header-box', '.operating', '.slide-content-box',
  ],

  preprocess(doc: Document) {
    // 代码块清理：提取纯文本内容
    doc.querySelectorAll('pre code').forEach((code) => {
      const textContent = code.textContent || '';
      code.textContent = textContent;
    });
  },

  fallbackSelectors: [
    '#article_content', '#content_views', '.markdown_views',
    '.htmledit_views', 'article.baidu_pl',
  ],
};
