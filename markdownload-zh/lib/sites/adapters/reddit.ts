/**
 * Reddit 适配器
 *
 * ⚠️ extractRedditContent() 原样搬迁自 extractor.unlisted.ts，不改任何逻辑
 */
import type { SiteAdapter } from '../../types';

/**
 * 专门为 Reddit 提取内容
 * 支持新版 Shreddit（Shadow DOM）和旧版 Reddit
 *
 * @param doc 工作文档（克隆后的，用于 DOM 变更和旧版 Reddit）
 * @param _url 页面 URL（未使用）
 * @param sourceDoc 原始文档（用于 Shadow DOM 读取，cloneNode 无法复制 shadowRoot）
 */
function extractRedditContent(
  doc: Document,
  _url: string,
  sourceDoc?: Document
): { title: string; content: string } | null {
  // Reddit DOM 结构复杂，Readability 经常失败，需要手动提取

  // 尝试从原始文档的 Shadow DOM 读取（新版 Shreddit UI）
  // cloneNode(true) 不会复制 Shadow DOM，所以必须用 sourceDoc
  const liveDoc = sourceDoc || doc;
  const shredditPost = liveDoc.querySelector('shreddit-post') as HTMLElement | null;
  const shadowRoot = shredditPost?.shadowRoot;

  // 提取标题（多选择器降级）
  let title: string | undefined;
  if (shadowRoot) {
    title = shadowRoot.querySelector('[slot="title"]')?.textContent?.trim();
  }
  if (!title) {
    title =
      liveDoc.querySelector('h1[slot="title"]')?.textContent?.trim() ||
      liveDoc.querySelector('[data-testid="post-title"]')?.textContent?.trim() ||
      liveDoc.querySelector('h1')?.textContent?.trim() ||
      liveDoc.title || doc.title;
  }

  // 构建内容容器
  const contentContainer = doc.createElement('div');

  // 1. 提取媒体内容（图片/视频）
  let mediaEl: Element | null = null;

  // 新版 Shreddit UI 的媒体容器
  if (shadowRoot) {
    mediaEl = shadowRoot.querySelector('[slot="post-media-container"]');
  }
  if (!mediaEl) {
    mediaEl =
      liveDoc.querySelector('[slot="post-media-container"]') ||
      liveDoc.querySelector('shreddit-post [slot="post-media-container"]') ||
      liveDoc.querySelector('[data-testid="post-container"] [data-testid="media-container"]') ||
      liveDoc.querySelector('.Post [data-click-id="media"]');
  }

  if (mediaEl) {
    // 提取图片
    const images = mediaEl.querySelectorAll('img');
    images.forEach((img) => {
      // 获取最佳图片 URL（优先 src，然后各种 data-* 属性）
      let imgSrc = img.getAttribute('src') || '';

      // Reddit 图片可能使用 data-lazy-src 或其他属性
      if (!imgSrc || imgSrc.includes('placeholder') || imgSrc.startsWith('data:')) {
        imgSrc = img.getAttribute('data-src') ||
                 img.getAttribute('data-lazy-src') ||
                 img.getAttribute('data-preview-src') ||
                 '';
      }

      // 过滤掉非实际图片的 URL
      if (imgSrc && !imgSrc.includes('pixel') && !imgSrc.includes('spacer')) {
        const newImg = doc.createElement('img');
        newImg.setAttribute('src', imgSrc);
        newImg.setAttribute('alt', img.getAttribute('alt') || 'Reddit image');
        contentContainer.appendChild(newImg);
        contentContainer.appendChild(doc.createElement('br'));
      }
    });

    // 提取画廊中的图片（shreddit-gallery）
    const gallery = mediaEl.querySelector('shreddit-gallery, [data-testid="gallery"]');
    if (gallery) {
      // 画廊可能有多个图片 URL 存储在 data 属性中
      const galleryImages = gallery.querySelectorAll('img, [data-testid="media-element"]');
      galleryImages.forEach((img) => {
        const imgEl = img as HTMLImageElement;
        const imgSrc = imgEl.src || imgEl.getAttribute('data-src') || '';
        if (imgSrc && !imgSrc.includes('placeholder')) {
          const newImg = doc.createElement('img');
          newImg.setAttribute('src', imgSrc);
          newImg.setAttribute('alt', imgEl.alt || 'Reddit gallery image');
          contentContainer.appendChild(newImg);
          contentContainer.appendChild(doc.createElement('br'));
        }
      });
    }
  }

  // 2. 提取文本正文
  let postContentEl: Element | null = null;

  // 优先从 Shadow DOM 读取（新版 Shreddit）
  if (shadowRoot) {
    postContentEl =
      shadowRoot.querySelector('[slot="text-body"]') ||
      shadowRoot.querySelector('[data-testid="post-content"]');
  }

  // Light DOM 降级路径（旧版 Reddit 或 old.reddit.com）
  if (!postContentEl) {
    postContentEl =
      liveDoc.querySelector('[slot="text-body"]') ||
      liveDoc.querySelector('[data-testid="post-container"] [data-testid="post-content"]') ||
      liveDoc.querySelector('.Post [data-click-id="text"]') ||
      liveDoc.querySelector('.usertext-body') ||  // old.reddit
      liveDoc.querySelector('.md');  // old.reddit markdown
  }

  if (postContentEl) {
    const contentClone = postContentEl.cloneNode(true) as HTMLElement;
    contentContainer.appendChild(contentClone);
  }

  // 如果既没有媒体也没有文本内容，返回 null
  if (!contentContainer.innerHTML.trim()) {
    return null;
  }

  return {
    title: title || 'Untitled',
    content: contentContainer.innerHTML,
  };
}

export const redditAdapter: SiteAdapter = {
  id: 'reddit',
  match: 'reddit.com',
  siteName: 'Reddit',
  needsSourceDoc: true,

  customExtract(doc: Document, url: string, sourceDoc?: Document) {
    return extractRedditContent(doc, url, sourceDoc);
  },
};
