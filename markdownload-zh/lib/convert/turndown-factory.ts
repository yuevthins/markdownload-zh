/**
 * Turndown 实例工厂 + 自定义规则
 *
 * 从 extractor.unlisted.ts getTurndownService() 原样迁移
 */
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { LAZY_IMAGE_ATTRS, normalizeImageUrl, isPlaceholderSrc } from '@/utils/lazy-image';
import { getSmartAlt } from './smart-alt';

/**
 * TurndownService 单例（性能优化：避免重复创建实例和添加规则）
 */
let _turndownInstance: TurndownService | null = null;

/**
 * 当前转换的页面 URL（由 setBaseUrl 设置，替代 window.location.href）
 */
let _currentBaseUrl = '';

/**
 * 设置当前页面 URL（在 convertToMarkdown 前调用）
 */
export function setBaseUrl(url: string): void {
  _currentBaseUrl = url;
}

/**
 * 获取 Turndown 服务（单例模式）
 *
 * 性能优化：TurndownService 实例和规则只创建一次，后续调用直接复用。
 * 在浏览器扩展场景中，每次页面注入都会创建新的 JS 上下文，
 * 所以单例只在单个页面的生命周期内有效，不会跨页面复用。
 */
export function getTurndownService(): TurndownService {
  if (_turndownInstance) {
    return _turndownInstance;
  }

  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    bulletListMarker: '-',
  });

  turndown.use(gfm);

  // 处理懒加载图片（支持多种 data-* 属性 + 相对路径）
  turndown.addRule('lazyImages', {
    filter: (node) => {
      if (node.nodeName !== 'IMG') return false;
      const src = node.getAttribute('src');
      // 如果 src 是占位符，检查是否有懒加载属性
      if (isPlaceholderSrc(src)) {
        return LAZY_IMAGE_ATTRS.some((attr) => node.getAttribute(attr));
      }
      return false;
    },
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const baseUrl = _currentBaseUrl || (typeof window !== 'undefined' ? window.location.href : '');
      let src = '';

      // 按优先级尝试获取真实图片 URL
      for (const attr of LAZY_IMAGE_ATTRS) {
        const value = img.getAttribute(attr);
        const normalizedUrl = normalizeImageUrl(value || '', baseUrl);
        if (normalizedUrl) {
          src = normalizedUrl;
          break;
        }
      }

      // 如果还是没有，尝试从 srcset 提取
      if (!src) {
        const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
        if (srcset) {
          const firstUrl = srcset.split(',')[0]?.trim().split(' ')[0] || '';
          src = normalizeImageUrl(firstUrl, baseUrl) || '';
        }
      }

      const alt = getSmartAlt(img);
      return src ? `![${alt}](${src})` : '';
    },
  });

  // 处理 figure 元素（包含图片和说明）
  turndown.addRule('figure', {
    filter: 'figure',
    replacement: (content) => {
      return '\n\n' + content.trim() + '\n\n';
    },
  });

  // 处理 figcaption 元素
  turndown.addRule('figcaption', {
    filter: 'figcaption',
    replacement: (content) => {
      return '\n*' + content.trim() + '*\n';
    },
  });

  turndown.addRule('emptyLinks', {
    filter: (node) => {
      return (
        node.nodeName === 'A' &&
        (!node.getAttribute('href') ||
          node.getAttribute('href')?.startsWith('javascript:') ||
          false)
      );
    },
    replacement: (content) => content,
  });

  _turndownInstance = turndown;
  return turndown;
}
