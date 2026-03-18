#!/usr/bin/env npx tsx
/**
 * 内容提取自动测试脚本
 *
 * 这个脚本可以：
 * 1. 从已保存的 fixtures 运行测试
 * 2. 从 URL 列表获取实时页面并测试
 * 3. 生成测试报告
 *
 * 用法：
 *   npx tsx scripts/run-extraction-tests.ts
 *   npx tsx scripts/run-extraction-tests.ts --live   # 使用实时 URL
 *   npx tsx scripts/run-extraction-tests.ts --report # 生成详细报告
 */

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 导入工具函数
import { normalizeImageUrl, isPlaceholderSrc, LAZY_IMAGE_ATTRS } from '../utils/lazy-image.js';
import { removeZeroWidthChars } from '../utils/text-cleanup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../tests/fixtures');
const REPORTS_DIR = path.resolve(__dirname, '../tests/reports');

// ============================================================
// 提取逻辑（简化版，与 extractor.unlisted.ts 保持一致）
// ============================================================

function createTurndownService(): TurndownService {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    bulletListMarker: '-',
  });
  turndown.use(gfm);
  return turndown;
}

function preprocessLazyImages(doc: Document, baseUrl: string): void {
  doc.querySelectorAll('img').forEach((img) => {
    const currentSrc = img.getAttribute('src');
    const hasLazyAttr = LAZY_IMAGE_ATTRS.some((attr) => img.hasAttribute(attr));

    if (!isPlaceholderSrc(currentSrc) && !hasLazyAttr) {
      return;
    }

    for (const attr of LAZY_IMAGE_ATTRS) {
      const value = img.getAttribute(attr);
      const normalizedUrl = normalizeImageUrl(value || '', baseUrl);
      if (normalizedUrl) {
        img.setAttribute('src', normalizedUrl);
        break;
      }
    }
  });
}

function normalizeTables(doc: Document): void {
  doc.querySelectorAll('table').forEach((table) => {
    Array.from(table.attributes).forEach((attr) => table.removeAttribute(attr.name));
    table.querySelectorAll('colgroup').forEach((el) => el.remove());

    table.querySelectorAll('thead, tbody, tfoot, tr, th, td').forEach((el) => {
      const rowspan = el.getAttribute('rowspan');
      const colspan = el.getAttribute('colspan');
      Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));
      if (rowspan) el.setAttribute('rowspan', rowspan);
      if (colspan) el.setAttribute('colspan', colspan);
    });

    if (!table.querySelector('thead')) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        firstRow.querySelectorAll('td').forEach((td) => {
          const th = doc.createElement('th');
          while (td.firstChild) th.appendChild(td.firstChild);
          td.replaceWith(th);
        });
        const thead = doc.createElement('thead');
        thead.appendChild(firstRow);
        let tbody = table.querySelector('tbody');
        if (!tbody) {
          tbody = doc.createElement('tbody');
          table.querySelectorAll('tr').forEach((tr) => tbody!.appendChild(tr));
        }
        table.insertBefore(thead, table.firstChild);
        if (!table.contains(tbody)) table.appendChild(tbody);
      }
    }

    table.querySelectorAll('th, td').forEach((cell) => {
      const blocks = cell.querySelectorAll('div, p');
      blocks.forEach((block, idx) => {
        if (idx > 0 && block.parentNode === cell) {
          cell.insertBefore(doc.createElement('br'), block);
        }
        while (block.firstChild) block.parentNode?.insertBefore(block.firstChild, block);
        block.remove();
      });

      cell.querySelectorAll('span').forEach((span) => {
        while (span.firstChild) span.parentNode?.insertBefore(span.firstChild, span);
        span.remove();
      });
    });
  });
}

interface ExtractResult {
  success: boolean;
  title: string;
  markdown: string;
  charCount: number;
  error?: string;
  duration: number;
}

function preprocessCSDN(doc: Document, url: string): void {
  if (!url.includes('csdn.net')) return;

  // CSDN 代码块清理：Prism.js 语法高亮会将代码包裹在大量 <span class="token ..."> 中
  // 当代码示例包含 HTML 时，实体解码后会产生真实的 HTML 标签
  // 解决方案：提取代码块的纯文本内容，移除所有 span 包装
  doc.querySelectorAll('pre code').forEach((code) => {
    const textContent = code.textContent || '';
    code.textContent = textContent;
  });
}

function extractFromHtml(html: string, url: string): ExtractResult {
  const startTime = Date.now();

  try {
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    preprocessLazyImages(doc, url);
    preprocessCSDN(doc, url);
    normalizeTables(doc);

    const reader = new Readability(doc, { debug: false, charThreshold: 50 });
    const article = reader.parse();

    if (!article || !article.content) {
      return {
        success: false,
        title: '',
        markdown: '',
        charCount: 0,
        error: 'NO_CONTENT',
        duration: Date.now() - startTime,
      };
    }

    const turndown = createTurndownService();
    const markdown = removeZeroWidthChars(turndown.turndown(article.content));

    return {
      success: true,
      title: article.title || 'Untitled',
      markdown: markdown.trim(),
      charCount: markdown.length,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      title: '',
      markdown: '',
      charCount: 0,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

// ============================================================
// 测试用例定义
// ============================================================

interface TestCase {
  name: string;
  fixture?: string;
  url: string;
  minChars: number;
  checks?: {
    hasCodeBlocks?: boolean;
    hasImages?: boolean;
    hasTables?: boolean;
    noResidualHtml?: boolean;
  };
}

const TEST_CASES: TestCase[] = [
  // ============================================================
  // 基准测试（使用本地构造的 fixtures）
  // ============================================================
  {
    name: '示例文章（基准）',
    fixture: 'sample-article.html',
    url: 'https://example.com/article',
    minChars: 200,
    checks: { hasCodeBlocks: true, hasTables: true, noResidualHtml: true },
  },
  {
    name: '复杂表格',
    fixture: 'complex-table.html',
    url: 'https://seller.tiktokshopglobalselling.com/article',
    minChars: 50,
    checks: { hasTables: true, noResidualHtml: true },
  },
  {
    name: '懒加载图片',
    fixture: 'lazy-images.html',
    url: 'https://example.com/images',
    minChars: 50,
    checks: { hasImages: true, noResidualHtml: true },
  },

  // ============================================================
  // 真实站点测试 - 新闻类
  // ============================================================
  {
    name: '澎湃新闻',
    fixture: 'thepaper-article.html',
    url: 'https://www.thepaper.cn/newsDetail_forward_26154789',
    minChars: 300,
    checks: { noResidualHtml: true },
  },

  // ============================================================
  // 真实站点测试 - 技术博客
  // ============================================================
  {
    name: 'SegmentFault',
    fixture: 'segmentfault-article.html',
    url: 'https://segmentfault.com/a/1190000044851595',
    minChars: 200,
    checks: { noResidualHtml: true },
  },
  // InfoQ 是 SPA，静态 fetch 无法获取内容，已移除

  // ============================================================
  // 真实站点测试 - 产品/设计
  // ============================================================
  {
    name: '少数派',
    fixture: 'sspai-article.html',
    url: 'https://sspai.com/post/85736',
    minChars: 500,
    checks: { hasImages: true, noResidualHtml: true },
  },

  // ============================================================
  // 真实站点测试 - 百科/知识
  // ============================================================
  {
    name: '百度百科',
    fixture: 'baike-article.html',
    url: 'https://baike.baidu.com/item/Markdown/3245829',
    minChars: 300,
    checks: { noResidualHtml: true },
  },

  // 注意：新浪新闻、网易新闻、OSChina、V2EX 的测试 URL 返回 404
  // 需要找到有效的 URL 后再启用这些测试

  // ============================================================
  // 博客平台
  // ============================================================
  {
    name: '简书',
    fixture: 'jianshu-article.html',
    url: 'https://www.jianshu.com/p/191d1e21f7ed',
    minChars: 200,
    checks: { noResidualHtml: true },
  },

  // ============================================================
  // 百科知识
  // ============================================================
  {
    name: '维基百科中文',
    fixture: 'wikipedia-zh-article.html',
    url: 'https://zh.wikipedia.org/wiki/Markdown',
    minChars: 500,
    // 注意：维基百科文章中包含 HTML 示例代码，不检查 noResidualHtml
    checks: {},
  },

  // ============================================================
  // 待添加 fixtures 的站点（需要手动获取）
  // ============================================================
  {
    name: '知乎专栏',
    fixture: 'zhihu-article.html',
    url: 'https://zhuanlan.zhihu.com/p/1982808152299823612',
    minChars: 500,
    checks: { hasImages: true, noResidualHtml: true },
  },
  {
    name: '微信公众号',
    fixture: 'wechat-article.html',
    url: 'https://mp.weixin.qq.com/s/xxxxx',
    minChars: 300,
    checks: { hasImages: true, noResidualHtml: true },
  },
  {
    name: 'CSDN',
    fixture: 'csdn-article.html',
    url: 'https://blog.csdn.net/2401_82648291/article/details/156983068',
    minChars: 200,
    checks: { noResidualHtml: true },
  },
  {
    name: '博客园',
    fixture: 'cnblogs-article.html',
    url: 'https://www.cnblogs.com/ClownLMe/p/19529417',
    minChars: 200,
    checks: { noResidualHtml: true },
  },
];

// ============================================================
// 测试执行器
// ============================================================

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  extraction?: ExtractResult;
  checkResults?: Record<string, boolean>;
  error?: string;
}

function runChecks(markdown: string, checks: TestCase['checks']): Record<string, boolean> {
  const results: Record<string, boolean> = {};

  if (checks?.hasCodeBlocks) {
    results.hasCodeBlocks = /```[\s\S]*?```/.test(markdown);
  }

  if (checks?.hasImages) {
    results.hasImages = /!\[.*?\]\(https?:\/\/[^)]+\)/.test(markdown);
  }

  if (checks?.hasTables) {
    results.hasTables = /\|.*\|/.test(markdown);
  }

  if (checks?.noResidualHtml) {
    // 排除代码块中的内容（代码示例中的 HTML 是合法的）
    const withoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');
    results.noResidualHtml = !/<(div|span|p|table|tr|td|script|style)\b/i.test(withoutCodeBlocks);
  }

  return results;
}

async function runTests(cases: TestCase[]): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const testCase of cases) {
    console.log(`\n🧪 测试: ${testCase.name}`);

    // 检查 fixture 是否存在
    if (testCase.fixture) {
      const fixturePath = path.join(FIXTURES_DIR, testCase.fixture);
      if (!fs.existsSync(fixturePath)) {
        console.log(`   ⏭️  跳过（fixture 不存在: ${testCase.fixture}）`);
        results.push({ name: testCase.name, status: 'skip', error: 'fixture not found' });
        continue;
      }

      // 读取并测试
      const html = fs.readFileSync(fixturePath, 'utf-8');
      const extraction = extractFromHtml(html, testCase.url);

      // 检查结果
      const checkResults = runChecks(extraction.markdown, testCase.checks);
      const allChecksPassed = Object.values(checkResults).every((v) => v);
      const charsPassed = extraction.charCount >= testCase.minChars;
      const passed = extraction.success && charsPassed && allChecksPassed;

      if (passed) {
        console.log(`   ✅ 通过 (${extraction.charCount} 字符, ${extraction.duration}ms)`);
      } else {
        console.log(`   ❌ 失败`);
        if (!extraction.success) console.log(`      - 提取失败: ${extraction.error}`);
        if (!charsPassed) console.log(`      - 字符数不足: ${extraction.charCount} < ${testCase.minChars}`);
        for (const [check, result] of Object.entries(checkResults)) {
          if (!result) console.log(`      - 检查失败: ${check}`);
        }
      }

      results.push({
        name: testCase.name,
        status: passed ? 'pass' : 'fail',
        extraction,
        checkResults,
      });
    }
  }

  return results;
}

function generateReport(results: TestResult[]): void {
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  console.log('\n' + '═'.repeat(60));
  console.log('  测试报告');
  console.log('═'.repeat(60));
  console.log(`  ✅ 通过: ${passed}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log(`  ⏭️  跳过: ${skipped}`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    console.log('\n失败的测试:');
    for (const result of results.filter((r) => r.status === 'fail')) {
      console.log(`  - ${result.name}: ${result.extraction?.error || 'checks failed'}`);
    }
  }

  // 保存详细报告
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const reportPath = path.join(REPORTS_DIR, `report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 详细报告已保存: ${reportPath}`);
}

// ============================================================
// 主入口
// ============================================================

async function main(): Promise<void> {
  console.log('🚀 MarkDownload 内容提取自动测试\n');
  console.log(`📁 Fixtures 目录: ${FIXTURES_DIR}`);

  const results = await runTests(TEST_CASES);
  generateReport(results);

  // 退出码
  const failed = results.filter((r) => r.status === 'fail').length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
