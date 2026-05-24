/**
 * AI 常用国外站点适配器集合
 *
 * 目标是覆盖 AI 研究/开发日常剪藏的动态页、论文页、模型页和官方博客。
 */
import type { SiteAdapter } from '../../types';
import { createSimpleAdapter, createTechBlogAdapter } from '../helpers';

const SOCIAL_NOISE = [
  'nav',
  'aside',
  '[role="navigation"]',
  '[role="complementary"]',
  '[data-testid="sidebarColumn"]',
  '[data-testid="DMDrawer"]',
  '[data-testid="BottomBar"]',
  '[data-testid="trend"]',
  '[data-testid="placementTracking"]',
  '[aria-label*="Who to follow"]',
  '[aria-label*="Timeline: Trending"]',
  '.comments',
  '.comment',
  '.sidebar',
  '.right-rail',
  '.recommendations',
  '.related',
  '.related-posts',
  '.share-buttons',
  '.newsletter',
  '.ad',
  '.ads',
  '[class*="advert"]',
  'script',
  'style',
  'noscript',
];

function meta(doc: Document, selector: string): string {
  return doc.querySelector<HTMLMetaElement>(selector)?.content?.trim() || '';
}

function text(el: Element | null | undefined): string {
  return el?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function titleFrom(doc: Document, fallback = 'Untitled'): string {
  return (
    meta(doc, 'meta[property="og:title"]') ||
    meta(doc, 'meta[name="twitter:title"]') ||
    text(doc.querySelector('h1')) ||
    doc.title.replace(/\s+[-|].+$/, '').trim() ||
    fallback
  );
}

function cloneClean(el: Element, removeSelectors: string[] = []): HTMLElement {
  const clone = el.cloneNode(true) as HTMLElement;
  const selectors = [...SOCIAL_NOISE, ...removeSelectors].join(', ');
  clone.querySelectorAll(selectors).forEach((node) => node.remove());
  clone.querySelectorAll('[hidden], [aria-hidden="true"]').forEach((node) => node.remove());
  return clone;
}

function htmlDoc(doc: Document, title: string, parts: Array<string | Element>): string {
  const root = doc.createElement('article');
  const h1 = doc.createElement('h1');
  h1.textContent = title;
  root.appendChild(h1);

  for (const part of parts) {
    if (typeof part === 'string') {
      if (!part.trim()) continue;
      const p = doc.createElement('p');
      p.textContent = part.trim();
      root.appendChild(p);
    } else {
      root.appendChild(part);
    }
  }

  return root.innerHTML;
}

function addMetaImage(doc: Document, root: HTMLElement): void {
  const image = meta(doc, 'meta[property="og:image"]') || meta(doc, 'meta[name="twitter:image"]');
  if (!image || root.querySelector('img')) return;
  const img = doc.createElement('img');
  img.src = image;
  img.alt = titleFrom(doc, 'image');
  root.appendChild(img);
}

function metaFallback(doc: Document): { title: string; content: string } | null {
  const title = titleFrom(doc);
  const description =
    meta(doc, 'meta[property="og:description"]') ||
    meta(doc, 'meta[name="twitter:description"]') ||
    meta(doc, 'meta[name="description"]');
  const image = meta(doc, 'meta[property="og:image"]') || meta(doc, 'meta[name="twitter:image"]');
  if (!description && !image) return null;

  const root = doc.createElement('article');
  const h1 = doc.createElement('h1');
  h1.textContent = title;
  root.appendChild(h1);
  if (description) {
    const p = doc.createElement('p');
    p.textContent = description;
    root.appendChild(p);
  }
  addMetaImage(doc, root);
  return { title, content: root.innerHTML };
}



function extractArxiv(doc: Document, url: string): { title: string; content: string } | null {
  const htmlArticle = doc.querySelector<HTMLElement>('article.ltx_document, .ltx_document, main article, article');
  if (url.includes('/html/') && htmlArticle) {
    const title = titleFrom(doc);
    return { title, content: cloneClean(htmlArticle).innerHTML };
  }

  const title = text(doc.querySelector('h1.title, h1'))
    .replace(/^Title:\s*/i, '') || titleFrom(doc, 'arXiv Paper');
  const authors = text(doc.querySelector('.authors'));
  const abstract = text(doc.querySelector('blockquote.abstract, .abstract'))
    .replace(/^Abstract:\s*/i, '');
  const comments = text(doc.querySelector('.comments'));
  const subjects = text(doc.querySelector('.subjects'));

  if (!abstract && !authors) return metaFallback(doc);

  return {
    title,
    content: htmlDoc(doc, title, [
      authors ? `Authors: ${authors.replace(/^Authors:\s*/i, '')}` : '',
      abstract,
      comments ? `Comments: ${comments.replace(/^Comments:\s*/i, '')}` : '',
      subjects ? `Subjects: ${subjects.replace(/^Subjects:\s*/i, '')}` : '',
    ]),
  };
}

function extractHuggingFace(doc: Document, url: string): { title: string; content: string } | null {
  const title = titleFrom(doc, 'Hugging Face');
  const candidates = [
    'article',
    '.prose',
    '.markdown-body',
    '[data-target="ModelCard"]',
    '[data-target="DatasetCard"]',
    '.model-card-content',
    '.container .prose',
    'main',
  ];

  for (const selector of candidates) {
    const el = doc.querySelector<HTMLElement>(selector);
    if (el && text(el).length > 80) {
      const clone = cloneClean(el, [
        'header',
        'footer',
        '.relative.flex.items-center',
        '[data-testid="discussion"]',
      ]);
      addMetaImage(doc, clone);
      return { title, content: clone.innerHTML };
    }
  }

  if (url.includes('/papers/')) return metaFallback(doc);
  return metaFallback(doc);
}

function extractPapersWithCode(doc: Document): { title: string; content: string } | null {
  const title = titleFrom(doc, 'Papers with Code');
  const selectors = ['.paper-title', '.paper-abstract', '.paper-intro', '.paper-card', 'main', 'article'];
  const root = doc.createElement('article');
  const h1 = doc.createElement('h1');
  h1.textContent = title;
  root.appendChild(h1);

  for (const selector of selectors) {
    doc.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (text(el).length > 30) root.appendChild(cloneClean(el));
    });
  }

  return text(root).length > title.length + 40 ? { title, content: root.innerHTML } : metaFallback(doc);
}

function extractYouTube(doc: Document): { title: string; content: string } | null {
  const title = titleFrom(doc, 'YouTube Video');
  const scripts = [...doc.querySelectorAll('script')].map((script) => script.textContent || '').join('\n');
  const shortDescription = scripts.match(/"shortDescription":"((?:\\.|[^"\\])*)"/)?.[1]
    ?.replace(/\\n/g, '\n')
    .replace(/\\"/g, '"');
  const author = scripts.match(/"author":"((?:\\.|[^"\\])*)"/)?.[1]?.replace(/\\"/g, '"');

  const description =
    text(doc.querySelector('#description, ytd-watch-metadata #description')) ||
    shortDescription ||
    meta(doc, 'meta[name="description"]') ||
    meta(doc, 'meta[property="og:description"]');

  const parts = [author ? `Channel: ${author}` : '', description];
  const root = doc.createElement('article');
  root.innerHTML = htmlDoc(doc, title, parts);
  addMetaImage(doc, root);
  return text(root).length > title.length + 20 ? { title, content: root.innerHTML } : metaFallback(doc);
}

function extractLinkedIn(doc: Document): { title: string; content: string } | null {
  const title = titleFrom(doc, 'LinkedIn');
  const content = doc.querySelector<HTMLElement>(
    'article, .feed-shared-update-v2, .update-components-text, .article-main, main'
  );
  if (content && text(content).length > 60) {
    return { title, content: cloneClean(content).innerHTML };
  }
  return metaFallback(doc);
}

function extractAcademicGeneric(doc: Document): { title: string; content: string } | null {
  const title = titleFrom(doc, 'Paper');
  const selectors = [
    'article',
    'main',
    '#content',
    '.paper-detail',
    '.paper-abstract',
    '.abstract',
    '.note_content',
    '.note_content_field',
    '.forum-container',
  ];
  for (const selector of selectors) {
    const el = doc.querySelector<HTMLElement>(selector);
    if (el && text(el).length > 80) return { title, content: cloneClean(el).innerHTML };
  }
  return metaFallback(doc);
}

function extractArticleMain(doc: Document): { title: string; content: string } | null {
  const title = titleFrom(doc);
  for (const selector of ['article', 'main article', 'main', '.post-content', '.entry-content', '.prose']) {
    const el = doc.querySelector<HTMLElement>(selector);
    if (el && text(el).length > 80) return { title, content: cloneClean(el).innerHTML };
  }
  return metaFallback(doc);
}

export const arxivAdapter: SiteAdapter = {
  id: 'arxiv',
  match: (url: string) => url.includes('arxiv.org/') || url.includes('ar5iv.labs.arxiv.org/'),
  siteName: 'arXiv',
  customExtract: extractArxiv,
};

export const huggingFaceAdapter: SiteAdapter = {
  id: 'huggingface',
  match: 'huggingface.co',
  siteName: 'Hugging Face',
  customExtract: extractHuggingFace,
};

export const papersWithCodeAdapter: SiteAdapter = {
  id: 'paperswithcode',
  match: (url: string) => url.includes('paperswithcode.com/') || url.includes('hf.co/papers/'),
  siteName: 'Papers with Code',
  customExtract: extractPapersWithCode,
};

export const youtubeAdapter: SiteAdapter = {
  id: 'youtube',
  match: (url: string) => url.includes('youtube.com/watch') || url.includes('youtu.be/'),
  siteName: 'YouTube',
  customExtract: extractYouTube,
};

export const linkedinAdapter: SiteAdapter = {
  id: 'linkedin',
  match: (url: string) =>
    url.includes('linkedin.com/posts/') ||
    url.includes('linkedin.com/pulse/') ||
    url.includes('linkedin.com/feed/update/') ||
    url.includes('linkedin.com/company/'),
  siteName: 'LinkedIn',
  customExtract: extractLinkedIn,
};

export const lessWrongAdapter: SiteAdapter = {
  id: 'lesswrong',
  match: 'lesswrong.com',
  siteName: 'LessWrong',
  customExtract: extractArticleMain,
};

export const academicAdapters: SiteAdapter[] = [
  {
    id: 'semantic-scholar',
    match: 'semanticscholar.org',
    siteName: 'Semantic Scholar',
    customExtract: extractAcademicGeneric,
  },
  {
    id: 'openreview',
    match: 'openreview.net',
    siteName: 'OpenReview',
    customExtract: extractAcademicGeneric,
  },
  {
    id: 'acl-anthology',
    match: 'aclanthology.org',
    siteName: 'ACL Anthology',
    customExtract: extractAcademicGeneric,
  },
  {
    id: 'neurips',
    match: 'neurips.cc',
    siteName: 'NeurIPS',
    customExtract: extractAcademicGeneric,
  },
  {
    id: 'alphaxiv',
    match: 'alphaxiv.org',
    siteName: 'AlphaXiv',
    customExtract: extractAcademicGeneric,
  },
];

export const aiOfficialAdapters: SiteAdapter[] = [
  createTechBlogAdapter({ id: 'openai', match: 'openai.com', siteName: 'OpenAI', fallbackSelectors: ['article', 'main', '.prose'] }),
  createTechBlogAdapter({ id: 'anthropic', match: 'anthropic.com', siteName: 'Anthropic', fallbackSelectors: ['article', 'main'] }),
  createTechBlogAdapter({ id: 'deepmind', match: 'deepmind.google', siteName: 'Google DeepMind', fallbackSelectors: ['article', 'main'] }),
  createTechBlogAdapter({ id: 'google-ai', match: 'ai.google.dev', siteName: 'Google AI Developers', fallbackSelectors: ['article', 'main', '.devsite-article'] }),
  createTechBlogAdapter({ id: 'meta-ai', match: 'ai.meta.com', siteName: 'Meta AI', fallbackSelectors: ['article', 'main'] }),
  createTechBlogAdapter({ id: 'mistral', match: 'mistral.ai', siteName: 'Mistral AI', fallbackSelectors: ['article', 'main'] }),
  createTechBlogAdapter({ id: 'xai', match: 'x.ai', siteName: 'xAI', fallbackSelectors: ['article', 'main'] }),
];

export const aiToolAdapters: SiteAdapter[] = [
  createSimpleAdapter({ id: 'microsoft-research', match: 'microsoft.com/en-us/research', siteName: 'Microsoft Research', fallbackSelectors: ['article', 'main'] }),
  createTechBlogAdapter({ id: 'nvidia-blog', match: 'developer.nvidia.com/blog', siteName: 'NVIDIA Technical Blog', fallbackSelectors: ['article', 'main'] }),
  createTechBlogAdapter({ id: 'cohere', match: 'cohere.com', siteName: 'Cohere', fallbackSelectors: ['article', 'main', '.prose'] }),
  createTechBlogAdapter({ id: 'together-ai', match: 'together.ai', siteName: 'Together AI', fallbackSelectors: ['article', 'main'] }),
  createTechBlogAdapter({ id: 'replicate', match: 'replicate.com', siteName: 'Replicate', fallbackSelectors: ['article', 'main', '.prose'] }),
  createTechBlogAdapter({ id: 'modal', match: 'modal.com', siteName: 'Modal', fallbackSelectors: ['article', 'main'] }),
  createTechBlogAdapter({ id: 'cloudflare-ai', match: 'developers.cloudflare.com', siteName: 'Cloudflare Docs', fallbackSelectors: ['article', 'main'] }),
  createTechBlogAdapter({ id: 'langchain', match: 'langchain.com', siteName: 'LangChain', fallbackSelectors: ['article', 'main', '.prose'] }),
  createTechBlogAdapter({ id: 'llamaindex', match: 'llamaindex.ai', siteName: 'LlamaIndex', fallbackSelectors: ['article', 'main'] }),
  createTechBlogAdapter({ id: 'vercel-ai', match: 'sdk.vercel.ai', siteName: 'Vercel AI SDK', fallbackSelectors: ['article', 'main', '.prose'] }),
  createTechBlogAdapter({ id: 'cursor', match: 'cursor.com', siteName: 'Cursor', fallbackSelectors: ['article', 'main'] }),
];

export const aiInfoAdapters: SiteAdapter[] = [
  createSimpleAdapter({ id: 'openrouter', match: 'openrouter.ai', siteName: 'OpenRouter', fallbackSelectors: ['article', 'main'] }),
  createSimpleAdapter({ id: 'lmarena', match: 'lmarena.ai', siteName: 'LM Arena', fallbackSelectors: ['article', 'main'] }),
  createSimpleAdapter({ id: 'artificial-analysis', match: 'artificialanalysis.ai', siteName: 'Artificial Analysis', fallbackSelectors: ['article', 'main'] }),
  createTechBlogAdapter({ id: 'simon-willison', match: 'simonwillison.net', siteName: 'Simon Willison', fallbackSelectors: ['article', '.entry', 'main'] }),
  createTechBlogAdapter({ id: 'latent-space', match: 'latent.space', siteName: 'Latent Space', fallbackSelectors: ['article', '.post-content', 'main'] }),
  createTechBlogAdapter({ id: 'interconnects', match: 'interconnects.ai', siteName: 'Interconnects', fallbackSelectors: ['article', '.post-content', 'main'] }),
  createTechBlogAdapter({ id: 'the-batch', match: 'deeplearning.ai/the-batch', siteName: 'The Batch', fallbackSelectors: ['article', 'main'] }),
  createSimpleAdapter({ id: 'lobsters', match: 'lobste.rs', siteName: 'Lobsters', fallbackSelectors: ['.story_text', '.comments', '#inside'] }),
];

export const aiSiteAdapters: SiteAdapter[] = [
  arxivAdapter,
  huggingFaceAdapter,
  papersWithCodeAdapter,
  youtubeAdapter,
  linkedinAdapter,
  lessWrongAdapter,
  ...academicAdapters,
  ...aiOfficialAdapters,
  ...aiToolAdapters,
  ...aiInfoAdapters,
];
