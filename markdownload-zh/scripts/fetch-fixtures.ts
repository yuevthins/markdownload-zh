#!/usr/bin/env npx tsx
/**
 * HTML Fixtures 获取脚本
 *
 * 使用 Playwright 访问真实网站并保存 HTML 快照。
 *
 * 用法：
 *   npx tsx scripts/fetch-fixtures.ts
 *   npx tsx scripts/fetch-fixtures.ts --site zhihu
 *   npx tsx scripts/fetch-fixtures.ts --url "https://zhuanlan.zhihu.com/p/xxx"
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '../tests/fixtures');

// 预定义的测试 URL（可以替换为实际想测试的 URL）
const TEST_URLS: Record<string, { url: string; filename: string }> = {
  zhihu: {
    url: 'https://zhuanlan.zhihu.com/p/26299140190', // 示例文章
    filename: 'zhihu-article.html',
  },
  wechat: {
    url: '', // 需要手动填入微信文章 URL
    filename: 'wechat-article.html',
  },
  csdn: {
    url: 'https://blog.csdn.net/bisal/article/details/146247471', // 示例
    filename: 'csdn-article.html',
  },
  cnblogs: {
    url: 'https://www.cnblogs.com/obullxl/p/18687108/NTopic2025011501', // 示例
    filename: 'cnblogs-article.html',
  },
  woshipm: {
    url: '', // 需要手动填入
    filename: 'woshipm-article.html',
  },
  reddit: {
    url: '', // 需要手动填入
    filename: 'reddit-post.html',
  },
};

async function fetchFixture(url: string, filename: string): Promise<void> {
  if (!url) {
    console.log(`⏭️  跳过 ${filename}：URL 未配置`);
    return;
  }

  console.log(`🌐 获取 ${url}...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // 等待页面稳定（处理懒加载等）
    await page.waitForTimeout(2000);

    // 滚动页面以触发懒加载
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 100);
      });
    });

    // 再等待一下图片加载
    await page.waitForTimeout(1000);

    // 获取 HTML
    const html = await page.content();

    // 确保目录存在
    if (!fs.existsSync(FIXTURES_DIR)) {
      fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    }

    // 保存文件
    const filepath = path.join(FIXTURES_DIR, filename);
    fs.writeFileSync(filepath, html, 'utf-8');

    console.log(`✅ 已保存 ${filepath} (${(html.length / 1024).toFixed(1)} KB)`);
  } catch (error) {
    console.error(`❌ 获取失败 ${url}:`, error);
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // 解析参数
  const siteArg = args.find((a) => a.startsWith('--site='))?.split('=')[1];
  const urlArg = args.find((a) => a.startsWith('--url='))?.split('=')[1];

  if (urlArg) {
    // 单个 URL 模式
    const filename = `custom-${Date.now()}.html`;
    await fetchFixture(urlArg, filename);
    return;
  }

  if (siteArg) {
    // 单个站点模式
    const config = TEST_URLS[siteArg];
    if (!config) {
      console.error(`❌ 未知站点: ${siteArg}`);
      console.log(`可用站点: ${Object.keys(TEST_URLS).join(', ')}`);
      process.exit(1);
    }
    await fetchFixture(config.url, config.filename);
    return;
  }

  // 全部站点模式
  console.log('🚀 开始获取所有 fixtures...\n');

  for (const [site, config] of Object.entries(TEST_URLS)) {
    await fetchFixture(config.url, config.filename);
    console.log('');
  }

  console.log('✨ 完成！');
}

main().catch(console.error);
