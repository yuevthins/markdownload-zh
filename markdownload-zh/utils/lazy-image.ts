/**
 * 懒加载图片处理工具
 */

/**
 * 懒加载图片属性列表（按优先级排序）
 */
export const LAZY_IMAGE_ATTRS = [
  'data-src',
  'data-original',
  'data-actualsrc',
  'data-lazy-src',
  'data-lazyload',
  'data-lazy',
  'data-origin',
  'data-url',
  'data-echo',
  'data-defer-src',
  'data-hi-res-src',
  'data-srcset',
  'loading-src',
] as const;

/**
 * 归一化图片 URL（支持相对路径、协议相对路径）
 */
export function normalizeImageUrl(value: string, baseUrl: string): string | null {
  if (!value || value.trim() === '') return null;
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 判断 src 是否为占位图（需要被替换）
 */
export function isPlaceholderSrc(src: string | null): boolean {
  if (!src) return true;
  if (src.startsWith('data:')) return true;
  if (/placeholder|loading|blank|spacer|pixel|1x1|lazy|grey|gray/i.test(src)) return true;
  if (/\/img\/bd_logo|default\.(png|jpg|gif)|blank\.(png|jpg|gif)/i.test(src)) return true;
  return false;
}
