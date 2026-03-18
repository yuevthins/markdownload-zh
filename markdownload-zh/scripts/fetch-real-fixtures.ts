#!/usr/bin/env npx tsx
/**
 * 获取真实网站 HTML Fixtures
 *
 * 使用 Node.js fetch 获取服务端渲染的页面 HTML
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../tests/fixtures');

// 真实测试站点列表（使用当前有效的 URL）
// 注意：只包含 SSR（服务端渲染）站点，SPA 站点（如 InfoQ）需要浏览器渲染
const SITES: { name: string; filename: string; url: string; headers?: Record<string, string> }[] = [
  // ============================================================
  // 新闻类（SSR，静态 fetch 可获取内容）
  // ============================================================
  {
    name: '澎湃新闻',
    filename: 'thepaper-article.html',
    url: 'https://www.thepaper.cn/newsDetail_forward_26154789',
  },
  {
    name: '新浪新闻',
    filename: 'sina-news-article.html',
    url: 'https://news.sina.com.cn/c/2024-01-15/doc-inakyuny2776901.shtml',
  },
  {
    name: '网易新闻',
    filename: 'netease-news-article.html',
    url: 'https://www.163.com/dy/article/JOEP6P2V0511DSSR.html',
  },
  {
    name: '腾讯新闻',
    filename: 'qq-news-article.html',
    url: 'https://new.qq.com/rain/a/20240115A00XYZ00',
  },
  {
    name: '凤凰网',
    filename: 'ifeng-article.html',
    url: 'https://news.ifeng.com/c/8WQxxxxxxxxx',
  },

  // ============================================================
  // 技术博客（SSR）
  // ============================================================
  {
    name: 'SegmentFault',
    filename: 'segmentfault-article.html',
    url: 'https://segmentfault.com/a/1190000044851595',
  },
  {
    name: 'OSChina',
    filename: 'oschina-article.html',
    url: 'https://www.oschina.net/news/276007/tidb-8-0-ga',
  },
  {
    name: 'V2EX',
    filename: 'v2ex-topic.html',
    url: 'https://www.v2ex.com/t/1009000',
  },
  {
    name: 'Ruby China',
    filename: 'ruby-china-topic.html',
    url: 'https://ruby-china.org/topics/42000',
  },

  // ============================================================
  // 产品/设计
  // ============================================================
  {
    name: '少数派',
    filename: 'sspai-article.html',
    url: 'https://sspai.com/post/85736',
  },

  // ============================================================
  // 百科/知识
  // ============================================================
  {
    name: '百度百科',
    filename: 'baike-article.html',
    url: 'https://baike.baidu.com/item/Markdown/3245829',
  },
  {
    name: '维基百科中文',
    filename: 'wikipedia-zh-article.html',
    url: 'https://zh.wikipedia.org/wiki/Markdown',
  },

  // ============================================================
  // 博客平台（SSR）
  // ============================================================
  {
    name: '简书',
    filename: 'jianshu-article.html',
    url: 'https://www.jianshu.com/p/191d1e21f7ed',
  },

  // ============================================================
  // 论坛
  // ============================================================
  {
    name: '豆瓣小组',
    filename: 'douban-group.html',
    url: 'https://www.douban.com/group/topic/290000000/',
  },
];

async function fetchHtml(url: string, headers?: Record<string, string>): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

async function main(): Promise<void> {
  console.log('🚀 获取真实网站 HTML Fixtures\n');

  // 确保目录存在
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const site of SITES) {
    console.log(`📥 ${site.name}: ${site.url}`);

    try {
      const html = await fetchHtml(site.url, site.headers);
      const filepath = path.join(FIXTURES_DIR, site.filename);
      fs.writeFileSync(filepath, html, 'utf-8');
      console.log(`   ✅ 保存成功 (${(html.length / 1024).toFixed(1)} KB)`);
      success++;
    } catch (error) {
      console.log(`   ❌ 获取失败: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }

    // 避免请求过快
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n' + '═'.repeat(50));
  console.log(`  完成: ✅ ${success} 成功, ❌ ${failed} 失败`);
  console.log('═'.repeat(50));
}

main().catch(console.error);
