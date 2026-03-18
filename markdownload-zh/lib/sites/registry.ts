/**
 * 站点适配器注册表 + 匹配逻辑
 */
import type { SiteAdapter } from '../types';

/**
 * 精确 hostname 匹配 (O(1))
 */
const exactHostMap = new Map<string, SiteAdapter>();

/**
 * 域名后缀匹配（短数组遍历）
 */
const suffixEntries: { suffix: string; adapter: SiteAdapter }[] = [];

/**
 * 正则/函数匹配（短数组遍历）
 */
const patternEntries: { match: RegExp | ((url: string) => boolean); adapter: SiteAdapter }[] = [];

/**
 * 注册适配器
 */
export function registerAdapter(adapter: SiteAdapter): void {
  const { match } = adapter;

  if (typeof match === 'string') {
    // 判断是精确 hostname 还是域名后缀
    // 如果包含 / 或以特定路径开头，用 suffixEntries
    if (match.includes('/')) {
      suffixEntries.push({ suffix: match, adapter });
    } else if (match.startsWith('.') || match.includes('.')) {
      // 域名后缀匹配
      suffixEntries.push({ suffix: match, adapter });
    } else {
      exactHostMap.set(match, adapter);
    }
  } else {
    patternEntries.push({ match: match as RegExp | ((url: string) => boolean), adapter });
  }
}

/**
 * 批量注册适配器
 */
export function registerAdapters(adapters: SiteAdapter[]): void {
  for (const adapter of adapters) {
    registerAdapter(adapter);
  }
}

/**
 * 从 hostname 中提取主域名
 */
function getMainDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return hostname;
}

/**
 * 获取匹配的站点适配器
 *
 * 匹配优先级：
 * 1. 精确 hostname (O(1))
 * 2. URL 包含后缀（短数组遍历）
 * 3. 正则/函数匹配（短数组遍历）
 */
export function getSiteAdapter(url: string): SiteAdapter | null {
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    // URL 解析失败，跳过精确匹配
  }

  // 1. 精确 hostname
  if (hostname) {
    const exact = exactHostMap.get(hostname);
    if (exact) return exact;
  }

  // 2. 域名后缀匹配（仅对 hostname，不扫描完整 URL，避免路径/查询参数误判）
  for (const { suffix, adapter } of suffixEntries) {
    if (suffix.includes('/')) {
      // 路径匹配：拼接 hostname + pathname 检查
      try {
        const parsed = new URL(url);
        const hostAndPath = parsed.hostname + parsed.pathname;
        if (hostAndPath.includes(suffix)) return adapter;
      } catch {
        // URL 解析失败，跳过
      }
    } else {
      // 域名后缀匹配：仅对 hostname 操作
      if (hostname === suffix || hostname.endsWith('.' + suffix)) {
        return adapter;
      }
    }
  }

  // 3. 正则/函数匹配
  for (const { match, adapter } of patternEntries) {
    if (match instanceof RegExp) {
      if (match.test(url)) return adapter;
    } else {
      if (match(url)) return adapter;
    }
  }

  return null;
}

/**
 * 清空注册表（测试用）
 */
export function clearRegistry(): void {
  exactHostMap.clear();
  suffixEntries.length = 0;
  patternEntries.length = 0;
}
