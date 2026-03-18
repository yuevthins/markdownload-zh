/**
 * 集成测试：测试完整的内容提取链路
 *
 * 使用 runPipeline() 进行端到端测试
 */
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// 直接导入 pipeline 各阶段进行集成测试
import { preprocessDOM } from '../../lib/preprocess';
import { extractContent } from '../../lib/extract';
import { convertToMarkdown } from '../../lib/convert';
import { formatMarkdown } from '../../lib/format';
import { getSiteAdapter } from '../../lib/sites';

const FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

/**
 * 简化版 pipeline（在 Node.js/jsdom 中运行）
 */
async function extractFromHtml(html: string, url: string): Promise<{
  success: boolean;
  title: string;
  markdown: string;
  error?: string;
}> {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // 获取适配器
  const adapter = getSiteAdapter(url, doc);

  // Stage 1: Preprocess
  try {
    await preprocessDOM(doc, url, adapter);
  } catch (e) {
    console.warn('Preprocess failed:', e);
  }

  // Stage 2: Extract
  const extracted = await extractContent(doc, url, adapter);
  if (!extracted) {
    return { success: false, title: '', markdown: '', error: 'NO_CONTENT' };
  }

  // Stage 3: Convert
  const markdown = convertToMarkdown(extracted.html);

  // Stage 4: Format
  const formatted = formatMarkdown(markdown);

  return {
    success: true,
    title: extracted.title || 'Untitled',
    markdown: formatted,
  };
}

// ============================================================
// 测试用例
// ============================================================

describe('内容提取集成测试', () => {
  const fixturesExist = fs.existsSync(FIXTURES_DIR);

  describe('示例文章（基准测试）', () => {
    const fixturePath = path.join(FIXTURES_DIR, 'sample-article.html');
    const fixtureExists = fixturesExist && fs.existsSync(fixturePath);

    it.skipIf(!fixtureExists)('应该成功提取示例文章', async () => {
      const html = fs.readFileSync(fixturePath, 'utf-8');
      const result = await extractFromHtml(html, 'https://example.com/article');

      expect(result.success).toBe(true);
      expect(result.title).toContain('示例文章');
      expect(result.markdown.length).toBeGreaterThan(200);

      // 验证各种元素都被正确转换
      expect(result.markdown).toContain('## 第一节：简介');
      expect(result.markdown).toContain('**加粗文字**');
      expect(result.markdown).toContain('*斜体文字*');
      expect(result.markdown).toMatch(/\[链接\]\(https:\/\/example\.com\/?/);
      expect(result.markdown).toMatch(/-\s+列表项 1/);
      expect(result.markdown).toContain('```');  // 代码块
      expect(result.markdown).toContain('|');    // 表格
      expect(result.markdown).toContain('>');    // 引用
    });
  });

  describe('复杂表格', () => {
    const fixturePath = path.join(FIXTURES_DIR, 'complex-table.html');
    const fixtureExists = fixturesExist && fs.existsSync(fixturePath);

    it.skipIf(!fixtureExists)('应该正确转换 TikTok 风格的复杂表格', async () => {
      const html = fs.readFileSync(fixturePath, 'utf-8');
      const result = await extractFromHtml(html, 'https://seller.tiktokshopglobalselling.com/article');

      expect(result.success).toBe(true);
      expect(result.markdown).toContain('商品名称');
      expect(result.markdown).toContain('iPhone 15 Pro');
      expect(result.markdown).toContain('|');  // 表格格式
      expect(result.markdown).not.toMatch(/<td\b/i);
      expect(result.markdown).not.toMatch(/data-slate-editor/i);
    });

    it.skipIf(!fixtureExists)('应该正确处理 rowspan', async () => {
      const html = fs.readFileSync(fixturePath, 'utf-8');
      const result = await extractFromHtml(html, 'https://example.com');

      expect(result.success).toBe(true);
      expect(result.markdown).toContain('合并行');
      expect(result.markdown).toContain('普通单元格 1');
      expect(result.markdown).toContain('普通单元格 2');
    });
  });

  describe('懒加载图片', () => {
    const fixturePath = path.join(FIXTURES_DIR, 'lazy-images.html');
    const fixtureExists = fixturesExist && fs.existsSync(fixturePath);

    it.skipIf(!fixtureExists)('应该提取各种懒加载图片的真实 URL', async () => {
      const html = fs.readFileSync(fixturePath, 'utf-8');
      const result = await extractFromHtml(html, 'https://example.com');

      expect(result.success).toBe(true);

      // data-src
      expect(result.markdown).toContain('https://example.com/image1.jpg');
      // data-original
      expect(result.markdown).toContain('https://example.com/image2.jpg');
      // data-actualsrc
      expect(result.markdown).toContain('https://mmbiz.qpic.cn/image3.jpg');
      // data-lazy-src
      expect(result.markdown).toContain('https://example.com/image4.jpg');
      // 正常图片
      expect(result.markdown).toContain('https://example.com/normal-image.jpg');

      // 不应包含占位符
      expect(result.markdown).not.toContain('placeholder.gif');
      expect(result.markdown).not.toContain('loading.gif');
      expect(result.markdown).not.toContain('blank.png');
    });
  });

  // 真实站点测试
  describe('知乎专栏', () => {
    const fixturePath = path.join(FIXTURES_DIR, 'zhihu-article.html');
    const fixtureExists = fixturesExist && fs.existsSync(fixturePath);

    it.skipIf(!fixtureExists)('应该成功提取知乎文章', async () => {
      const html = fs.readFileSync(fixturePath, 'utf-8');
      const result = await extractFromHtml(html, 'https://zhuanlan.zhihu.com/p/123456789');

      expect(result.success).toBe(true);
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.markdown.length).toBeGreaterThan(500);
      expect(result.markdown).not.toMatch(/<div\b/i);
    });
  });

  describe('微信公众号', () => {
    const fixturePath = path.join(FIXTURES_DIR, 'wechat-article.html');
    const fixtureExists = fixturesExist && fs.existsSync(fixturePath);

    it.skipIf(!fixtureExists)('应该成功提取微信文章', async () => {
      const html = fs.readFileSync(fixturePath, 'utf-8');
      const result = await extractFromHtml(html, 'https://mp.weixin.qq.com/s/xxxxx');

      expect(result.success).toBe(true);
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.markdown.length).toBeGreaterThan(300);
    });
  });

  describe('CSDN', () => {
    const fixturePath = path.join(FIXTURES_DIR, 'csdn-article.html');
    const fixtureExists = fixturesExist && fs.existsSync(fixturePath);

    it.skipIf(!fixtureExists)('应该成功提取 CSDN 文章', async () => {
      const html = fs.readFileSync(fixturePath, 'utf-8');
      const result = await extractFromHtml(html, 'https://blog.csdn.net/xxx/article/details/123456');

      expect(result.success).toBe(true);
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.markdown.length).toBeGreaterThan(200);
    });
  });

  describe('博客园', () => {
    const fixturePath = path.join(FIXTURES_DIR, 'cnblogs-article.html');
    const fixtureExists = fixturesExist && fs.existsSync(fixturePath);

    it.skipIf(!fixtureExists)('应该成功提取博客园文章', async () => {
      const html = fs.readFileSync(fixturePath, 'utf-8');
      const result = await extractFromHtml(html, 'https://www.cnblogs.com/xxx/p/123456.html');

      expect(result.success).toBe(true);
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.markdown.length).toBeGreaterThan(200);
    });
  });

  describe('人人都是产品经理', () => {
    const fixturePath = path.join(FIXTURES_DIR, 'woshipm-article.html');
    const fixtureExists = fixturesExist && fs.existsSync(fixturePath);

    it.skipIf(!fixtureExists)('应该成功提取人人都是产品经理文章', async () => {
      const html = fs.readFileSync(fixturePath, 'utf-8');
      const result = await extractFromHtml(html, 'https://www.woshipm.com/xxx.html');

      expect(result.success).toBe(true);
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.markdown.length).toBeGreaterThan(300);
    });
  });
});

describe('表格转换测试', () => {
  it('应该正确转换简单表格', async () => {
    const html = `
      <html>
        <head><title>表格测试</title></head>
        <body>
          <article>
            <h1>表格测试</h1>
            <table>
              <tr><td>A</td><td>B</td></tr>
              <tr><td>1</td><td>2</td></tr>
            </table>
          </article>
        </body>
      </html>
    `;

    const result = await extractFromHtml(html, 'https://example.com');

    expect(result.success).toBe(true);
    expect(result.markdown).toContain('|');
    expect(result.markdown).not.toMatch(/<table\b/i);
  });

  it('应该处理复杂嵌套表格', async () => {
    const html = `
      <html>
        <head><title>复杂表格</title></head>
        <body>
          <article>
            <h1>复杂表格</h1>
            <table data-zone-id="123" class="some-class">
              <tr><td><div><p><span>Header 1</span></p></div></td><td>Header 2</td></tr>
              <tr><td>Cell 1</td><td>Cell 2</td></tr>
            </table>
          </article>
        </body>
      </html>
    `;

    const result = await extractFromHtml(html, 'https://example.com');

    expect(result.success).toBe(true);
    expect(result.markdown).toContain('Header 1');
    expect(result.markdown).toContain('Cell 1');
    expect(result.markdown).not.toMatch(/<div\b/i);
    expect(result.markdown).not.toMatch(/<span\b/i);
  });
});

describe('懒加载图片测试', () => {
  it('应该提取 data-src 图片', async () => {
    const html = `
      <html>
        <head><title>图片测试</title></head>
        <body>
          <article>
            <h1>图片测试</h1>
            <p>这是一张图片：</p>
            <img src="placeholder.gif" data-src="https://example.com/real-image.jpg" alt="真实图片">
          </article>
        </body>
      </html>
    `;

    const result = await extractFromHtml(html, 'https://example.com');

    expect(result.success).toBe(true);
    expect(result.markdown).toContain('https://example.com/real-image.jpg');
    expect(result.markdown).not.toContain('placeholder.gif');
  });
});

describe('站点适配器匹配测试', () => {
  it('应该匹配微信公众号', () => {
    const adapter = getSiteAdapter('https://mp.weixin.qq.com/s/xxxx');
    expect(adapter).not.toBeNull();
    expect(adapter!.id).toBe('wechat');
  });

  it('应该匹配知乎', () => {
    const adapter = getSiteAdapter('https://zhuanlan.zhihu.com/p/123');
    expect(adapter).not.toBeNull();
    expect(adapter!.id).toBe('zhihu');
  });

  it('应该匹配 CSDN', () => {
    const adapter = getSiteAdapter('https://blog.csdn.net/xxx/article/details/123');
    expect(adapter).not.toBeNull();
    expect(adapter!.id).toBe('csdn');
  });

  it('应该匹配 Reddit', () => {
    const adapter = getSiteAdapter('https://www.reddit.com/r/test/comments/abc');
    expect(adapter).not.toBeNull();
    expect(adapter!.id).toBe('reddit');
  });

  it('应该匹配腾讯新闻', () => {
    const adapter = getSiteAdapter('https://news.qq.com/rain/a/123');
    expect(adapter).not.toBeNull();
    expect(adapter!.id).toBe('qq-news');
  });

  it('应该匹配 TikTok Shop', () => {
    const adapter = getSiteAdapter('https://seller.tiktokshopglobalselling.com/article/123');
    expect(adapter).not.toBeNull();
    expect(adapter!.id).toBe('tiktok-shop');
  });

  it('对于未知站点应该返回 null', () => {
    const adapter = getSiteAdapter('https://unknown-site.example.com/page');
    expect(adapter).toBeNull();
  });
});
