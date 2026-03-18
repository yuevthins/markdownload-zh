/**
 * 通用懒加载图片预处理
 *
 * 从 extractor.unlisted.ts preprocessLazyImages() 原样迁移
 */
import { LAZY_IMAGE_ATTRS, normalizeImageUrl, isPlaceholderSrc } from '@/utils/lazy-image';

/**
 * 预计算懒加载属性选择器（性能优化：避免运行时构建）
 */
const LAZY_ATTR_SELECTOR = LAZY_IMAGE_ATTRS.map(attr => `img[${attr}]`).join(',');

/**
 * 通用懒加载图片预处理
 *
 * 性能优化：使用 CSS 选择器预先筛选有懒加载属性的图片，
 * 避免遍历所有图片并逐一检查属性。
 */
export function preprocessLazyImages(doc: Document, baseUrl: string): void {
  const processedImages = new Set<Element>();

  /**
   * 处理单个懒加载图片
   */
  const processImage = (img: Element): void => {
    if (processedImages.has(img)) return;
    processedImages.add(img);

    // 尝试从各种 data-* 属性获取真实图片 URL
    for (const attr of LAZY_IMAGE_ATTRS) {
      const value = img.getAttribute(attr);
      const normalizedUrl = normalizeImageUrl(value || '', baseUrl);
      if (normalizedUrl) {
        img.setAttribute('src', normalizedUrl);
        return; // 找到有效 URL 就返回
      }
    }

    // 处理 srcset（如果上面没找到有效 URL）
    const srcset = img.getAttribute('data-srcset') || img.getAttribute('srcset');
    if (srcset && isPlaceholderSrc(img.getAttribute('src'))) {
      const firstUrl = srcset.split(',')[0]?.trim().split(' ')[0];
      const normalizedUrl = normalizeImageUrl(firstUrl || '', baseUrl);
      if (normalizedUrl) {
        img.setAttribute('src', normalizedUrl);
      }
    }
  };

  // 优化 1: 使用 CSS 选择器一次性筛选有懒加载属性的图片（O(1) 查询）
  doc.querySelectorAll(LAZY_ATTR_SELECTOR).forEach(processImage);

  // 优化 2: 只检查剩余的占位符 src 图片（通常很少）
  doc.querySelectorAll('img').forEach((img) => {
    if (processedImages.has(img)) return;
    const currentSrc = img.getAttribute('src');
    if (isPlaceholderSrc(currentSrc)) {
      processImage(img);
    }
  });

  // 处理 picture/source 元素
  doc.querySelectorAll('picture').forEach((picture) => {
    const img = picture.querySelector('img');
    if (!img) return;

    const sources = picture.querySelectorAll('source');
    for (const source of sources) {
      const srcset = source.getAttribute('srcset') || source.getAttribute('data-srcset');
      if (srcset) {
        const firstUrl = srcset.split(',')[0]?.trim().split(' ')[0];
        if (firstUrl && !img.getAttribute('src')) {
          img.setAttribute('src', firstUrl);
          break;
        }
      }
    }
  });

  // 处理 noscript 中的图片（某些站点在 noscript 中放置真实图片）
  doc.querySelectorAll('noscript').forEach((noscript) => {
    const content = noscript.textContent || '';
    if (!content.includes('<img')) return;

    // 使用 DOMParser 安全解析 HTML
    const parser = new DOMParser();
    const tempDoc = parser.parseFromString(content, 'text/html');
    const realImg = tempDoc.querySelector('img');
    if (!realImg) return;

    const realSrc = realImg.getAttribute('src');
    if (!realSrc) return;

    // 策略 1: 前一个兄弟是 IMG
    const prevSibling = noscript.previousElementSibling;
    if (prevSibling?.tagName === 'IMG' && isPlaceholderSrc(prevSibling.getAttribute('src'))) {
      prevSibling.setAttribute('src', realSrc);
      return;
    }

    // 策略 2: 后一个兄弟是 IMG
    const nextSibling = noscript.nextElementSibling;
    if (nextSibling?.tagName === 'IMG' && isPlaceholderSrc(nextSibling.getAttribute('src'))) {
      nextSibling.setAttribute('src', realSrc);
      return;
    }

    // 策略 3: 父元素内有占位 IMG（常见于 lazy-load wrapper）
    const parent = noscript.parentElement;
    if (parent) {
      const siblingImg = parent.querySelector('img');
      if (siblingImg && isPlaceholderSrc(siblingImg.getAttribute('src'))) {
        siblingImg.setAttribute('src', realSrc);
        return;
      }
    }

    // 策略 4: 无对应 IMG，创建新 IMG 替换 noscript
    const newImg = doc.createElement('img');
    newImg.setAttribute('src', realSrc);
    const alt = realImg.getAttribute('alt');
    if (alt) newImg.setAttribute('alt', alt);
    noscript.replaceWith(newImg);
  });
}

export { LAZY_ATTR_SELECTOR };
