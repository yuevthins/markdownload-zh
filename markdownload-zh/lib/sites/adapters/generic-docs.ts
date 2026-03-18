/**
 * 通用文档框架适配器
 *
 * 原样搬迁自 extractor.unlisted.ts 的文档站点匹配逻辑
 */
import type { SiteAdapter } from '../../types';

export const gitbookAdapter: SiteAdapter = {
  id: 'gitbook',
  match: (url: string) => url.includes('gitbook.io'),
  siteName: 'GitBook',
  removeSelectors: [
    '.book-summary', '.navigation', '.page-actions',
    '[class*="toolbar"]', '[class*="search"]',
  ],
};

// 基于 DOM 特征匹配的适配器无法在 URL 阶段匹配
// 需要在 preprocess 阶段通过 DOM 检测
// 以下适配器使用宽泛 URL 匹配 + DOM 检测组合

export const readthedocsAdapter: SiteAdapter = {
  id: 'readthedocs',
  match: (url: string) => url.includes('readthedocs.io') || url.includes('readthedocs.org'),
  siteName: 'Read the Docs',
  removeSelectors: [
    '.wy-nav-side', '.rst-versions', '.rst-footer-buttons',
    '[role="navigation"]', '.wy-side-scroll',
  ],
};

export const docusaurusAdapter: SiteAdapter = {
  id: 'docusaurus',
  match: (url: string) => false, // 仅 DOM 检测
  removeSelectors: [
    '.theme-doc-sidebar-container', '.pagination-nav',
    '.navbar', '.footer', '[class*="tableOfContents"]',
  ],
};

export const vuepressAdapter: SiteAdapter = {
  id: 'vuepress',
  match: (url: string) => false, // 仅 DOM 检测
  removeSelectors: [
    '.sidebar', '.page-nav', '.navbar',
    '.vp-sidebar', '.vp-nav', '[class*="footer"]',
  ],
};

export const mkdocsAdapter: SiteAdapter = {
  id: 'mkdocs',
  match: (url: string) => false, // 仅 DOM 检测
  removeSelectors: [
    '.md-sidebar', '.md-header', '.md-footer',
    '[class*="navigation"]', '[class*="search"]',
  ],
};

/**
 * DOM 检测匹配器
 * 在 preprocess 阶段调用，用于检测无法通过 URL 匹配的文档框架
 */
export function detectDocFramework(doc: Document): SiteAdapter | null {
  // GitBook（DOM 检测补充）
  if (doc.querySelector('.gitbook-root')) {
    return gitbookAdapter;
  }

  // Read the Docs（DOM 检测补充）
  if (doc.querySelector('.rst-versions')) {
    return readthedocsAdapter;
  }

  // Docusaurus
  if (doc.querySelector('[class*="docusaurus"]') || doc.querySelector('.theme-doc-sidebar-container')) {
    return docusaurusAdapter;
  }

  // VuePress/VitePress
  if (doc.querySelector('.vp-sidebar') || doc.querySelector('.sidebar-links') ||
      doc.querySelector('[class*="vuepress"]')) {
    return vuepressAdapter;
  }

  // MkDocs
  if (doc.querySelector('[class*="md-sidebar"]') || doc.querySelector('.md-container')) {
    return mkdocsAdapter;
  }

  return null;
}

/**
 * 可通过 URL 匹配的文档站点适配器
 */
export const genericDocsAdapters: SiteAdapter[] = [
  gitbookAdapter,
  readthedocsAdapter,
];
