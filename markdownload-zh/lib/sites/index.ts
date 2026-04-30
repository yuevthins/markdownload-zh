/**
 * 站点适配器入口
 *
 * 导入所有适配器模块（触发注册），然后导出 getSiteAdapter
 */
import { registerAdapter, registerAdapters, getSiteAdapter as _getSiteAdapter } from './registry';
import { detectDocFramework } from './adapters/generic-docs';
import type { SiteAdapter } from '../types';

// 导入适配器
import { wechatAdapter } from './adapters/wechat';
import { redditAdapter } from './adapters/reddit';
import { discourseAdapter } from './adapters/discourse';
import { qqNewsAdapter } from './adapters/qq-news';
import { tiktokShopAdapter } from './adapters/tiktok-shop';
import { csdnAdapter } from './adapters/csdn';
import { zhihuAdapter } from './adapters/zhihu';
import { feishuAdapter } from './adapters/feishu';
import { aiSiteAdapters } from './adapters/ai-sites';
import { chineseTechAdapters } from './adapters/chinese-tech';
import { newsAdapters } from './adapters/news';
import { techBlogAdapters } from './adapters/tech-blogs';
import { genericDocsAdapters } from './adapters/generic-docs';
import { simpleAdapters } from './adapters/_simple';

// 注册所有适配器
// 注册顺序决定匹配优先级：更具体的在前

// 1. 复杂站点（有自定义逻辑）
registerAdapter(wechatAdapter);
registerAdapter(redditAdapter);
registerAdapter(discourseAdapter);
registerAdapter(qqNewsAdapter);
registerAdapter(tiktokShopAdapter);
registerAdapter(csdnAdapter);
registerAdapter(zhihuAdapter);
registerAdapter(feishuAdapter);
registerAdapters(aiSiteAdapters);

// 2. 中文技术社区
registerAdapters(chineseTechAdapters);

// 3. 新闻站点
registerAdapters(newsAdapters);

// 4. 技术博客
registerAdapters(techBlogAdapters);

// 5. 文档框架
registerAdapters(genericDocsAdapters);

// 6. 简单站点
registerAdapters(simpleAdapters);

/**
 * 获取站点适配器
 *
 * 先通过 URL 匹配，如果没有命中，再尝试 DOM 检测文档框架
 */
export function getSiteAdapter(url: string, doc?: Document): SiteAdapter | null {
  // URL 匹配
  const adapter = _getSiteAdapter(url);
  if (adapter) return adapter;

  // DOM 检测文档框架
  if (doc) {
    return detectDocFramework(doc);
  }

  return null;
}
