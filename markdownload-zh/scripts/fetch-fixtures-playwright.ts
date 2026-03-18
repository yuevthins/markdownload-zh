#!/usr/bin/env npx tsx
/**
 * 使用 Playwright 获取需要 JS 渲染的网站 HTML Fixtures
 *
 * 这个脚本使用真实浏览器获取页面，可以处理：
 * - JavaScript 渲染的内容
 * - 部分反爬措施
 * - 登录后的页面（需手动登录一次）
 *
 * 用法：
 *   npx tsx scripts/fetch-fixtures-playwright.ts
 *   npx tsx scripts/fetch-fixtures-playwright.ts --headed  # 显示浏览器窗口
 */

import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../tests/fixtures');

// 需要 JS 渲染的站点列表
interface Site {
  name: string;
  filename: string;
  url: string;
  waitFor?: string; // CSS 选择器，等待此元素出现
  waitTime?: number; // 额外等待时间（毫秒）
  scrollToBottom?: boolean; // 是否滚动到底部加载懒加载内容
}

const SITES: Site[] = [
  // ============================================================
  // 技术博客（需要 JS 渲染）
  // ============================================================
  {
    name: 'CSDN',
    filename: 'csdn-article.html',
    // 使用一个真实存在的 CSDN 文章
    url: 'https://blog.csdn.net/weixin_44799217/article/details/135625238',
    waitFor: '#article_content',
    waitTime: 2000,
  },
  {
    name: '博客园',
    filename: 'cnblogs-article.html',
    // 使用一个真实存在的博客园文章
    url: 'https://www.cnblogs.com/rubylouvre/p/18025506',
    waitFor: '#cnblogs_post_body',
    waitTime: 1000,
  },

  // ============================================================
  // 知识社区
  // ============================================================
  {
    name: '知乎专栏',
    filename: 'zhihu-article.html',
    // 知乎专栏公开文章
    url: 'https://zhuanlan.zhihu.com/p/672420730',
    waitFor: '.Post-RichTextContainer',
    waitTime: 3000,
    scrollToBottom: true,
  },

  // ============================================================
  // 技术社区（重试之前 404 的站点）
  // ============================================================
  {
    name: 'V2EX',
    filename: 'v2ex-topic.html',
    url: 'https://www.v2ex.com/t/1105000',
    waitFor: '.topic_content',
    waitTime: 1000,
  },
  {
    name: 'OSChina',
    filename: 'oschina-article.html',
    url: 'https://www.oschina.net/news/301000',
    waitFor: '.article-detail',
    waitTime: 2000,
  },

  // ============================================================
  // 新闻类
  // ============================================================
  {
    name: '网易新闻',
    filename: 'netease-news-article.html',
    url: 'https://www.163.com/dy/article/JT5FQKQR0511DSSR.html',
    waitFor: '.post_body',
    waitTime: 2000,
  },
  {
    name: '新浪新闻',
    filename: 'sina-news-article.html',
    url: 'https://news.sina.com.cn/c/2025-01-20/doc-inekkcqc4792883.shtml',
    waitFor: '.article',
    waitTime: 2000,
  },
];

async function fetchWithPlaywright(
  browser: Browser,
  site: Site
): Promise<{ success: boolean; html?: string; error?: string }> {
  let page: Page | null = null;

  try {
    page = await browser.newPage();

    // 设置 User-Agent
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    });

    // 导航到页面
    console.log(`   📡 正在加载页面...`);
    await page.goto(site.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // 等待特定元素出现
    if (site.waitFor) {
      console.log(`   ⏳ 等待元素: ${site.waitFor}`);
      try {
        await page.waitForSelector(site.waitFor, { timeout: 10000 });
      } catch {
        console.log(`   ⚠️ 元素 ${site.waitFor} 未找到，继续...`);
      }
    }

    // 滚动到底部加载懒加载内容
    if (site.scrollToBottom) {
      console.log(`   📜 滚动加载懒加载内容...`);
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 300;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });
    }

    // 额外等待时间
    if (site.waitTime) {
      console.log(`   ⏳ 等待 ${site.waitTime}ms...`);
      await page.waitForTimeout(site.waitTime);
    }

    // 获取完整 HTML
    const html = await page.content();

    return { success: true, html };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

async function main(): Promise<void> {
  const isHeaded = process.argv.includes('--headed');

  console.log('🚀 使用 Playwright 获取 HTML Fixtures\n');
  console.log(`   模式: ${isHeaded ? '有头浏览器（可视）' : '无头浏览器'}`);
  console.log(`   提示: 添加 --headed 参数可以看到浏览器窗口\n`);

  // 确保目录存在
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  let browser: Browser | null = null;

  try {
    console.log('🌐 启动浏览器...\n');
    browser = await chromium.launch({
      headless: !isHeaded,
    });

    let success = 0;
    let failed = 0;

    for (const site of SITES) {
      console.log(`📥 ${site.name}: ${site.url}`);

      const result = await fetchWithPlaywright(browser, site);

      if (result.success && result.html) {
        const filepath = path.join(FIXTURES_DIR, site.filename);
        fs.writeFileSync(filepath, result.html, 'utf-8');
        console.log(`   ✅ 保存成功 (${(result.html.length / 1024).toFixed(1)} KB)\n`);
        success++;
      } else {
        console.log(`   ❌ 获取失败: ${result.error}\n`);
        failed++;
      }
    }

    console.log('═'.repeat(50));
    console.log(`  完成: ✅ ${success} 成功, ❌ ${failed} 失败`);
    console.log('═'.repeat(50));
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main().catch(console.error);
