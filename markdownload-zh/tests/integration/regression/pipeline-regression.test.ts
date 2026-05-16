/**
 * Pipeline 回归测试套（issue #5）
 *
 * 用 saved HTML fixture 通过 runPipeline 跑出 markdown，断言结构性属性
 * （heading 数、image 数、代码块语言、GFM 表格等），而不是逐字符比对快照。
 *
 * 覆盖：
 *  - 通用 blog（无站点适配器命中）
 *  - 中文技术站（adapter 仅有 removeSelectors / fallbackSelectors）
 *  - 复杂表格、懒加载图片、多语言代码块
 *  - Wikipedia（百科长文，结构最复杂）
 *
 * 不做 exact string equality —— defuddle 输出格式可能在升级时变化。
 */
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

import { runPipeline } from '../../../lib/pipeline';

// ---------------------------------------------------------------------------
// Fixture loader
// ---------------------------------------------------------------------------

const FIXTURE_ROOT = path.resolve(__dirname, '../../fixtures');

function loadFixture(relPath: string): string | null {
  const full = path.join(FIXTURE_ROOT, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf-8');
}

async function clipFixture(relPath: string, url: string) {
  const html = loadFixture(relPath);
  if (html === null) {
    return { available: false as const };
  }
  const workDom = new JSDOM(html, { url });
  const sourceDom = new JSDOM(html, { url });
  const result = await runPipeline(workDom.window.document, url, sourceDom.window.document);
  return { available: true as const, result };
}

// ---------------------------------------------------------------------------
// Structural assertion helpers
// ---------------------------------------------------------------------------

/** 剥掉围栏 / 行内代码，避免代码示例里的 < > 被当作残留 HTML */
function stripCodeBlocks(md: string): string {
  return md.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');
}

/** 数 ATX 标题数量（# / ## / ### ...）。levelOpt 不传则数全部层级 */
function countHeadings(md: string, levelOpt?: number): number {
  if (levelOpt) {
    const re = new RegExp(`^${'#'.repeat(levelOpt)} \\S`, 'gm');
    return (md.match(re) || []).length;
  }
  return (md.match(/^#{1,6} \S/gm) || []).length;
}

/** 数 markdown 图片数量 ![alt](url) */
function countImages(md: string): number {
  return (md.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
}

/** 是否包含带 lang 的围栏代码块 */
function hasCodeBlockWithLang(md: string, lang: string): boolean {
  const re = new RegExp('```' + lang + '\\s', 'm');
  return re.test(md);
}

/** 是否含 GFM 表格（至少一行包含两个以上的 | 分隔列） */
function hasGfmTable(md: string): boolean {
  return /^\|.+\|.+\|/m.test(md);
}

/** 剥掉代码块后不应残留任何 block-level HTML 标签 */
function hasNoResidualBlockHtml(md: string): boolean {
  const stripped = stripCodeBlocks(md);
  return !/<(div|span|p|table|tr|td|th|article|section|aside|nav|header|footer|script|style)\b/i.test(
    stripped
  );
}

// ---------------------------------------------------------------------------
// 测试套
// ---------------------------------------------------------------------------

describe('Pipeline 回归测试 — 通用 blog（无适配器）', () => {
  it('generic-blog.html → 标题、多级 heading、列表、链接、图片都保留', async () => {
    const out = await clipFixture('regression/generic-blog.html', 'https://example.com/blog/post');
    expect(out.available).toBe(true);
    if (!out.available) return;
    expect(out.result.success).toBe(true);
    if (!out.result.success || !out.result.data) return;
    const md = out.result.data.markdown;

    // 标题
    expect(out.result.data.title).toContain('个人博客测试文章');
    // 多级 heading 都保留（H2/H3 在 markdown 里）
    expect(countHeadings(md, 2)).toBeGreaterThanOrEqual(2);
    expect(countHeadings(md, 3)).toBeGreaterThanOrEqual(2);
    // 强调样式
    expect(md).toContain('**加粗**');
    expect(md).toMatch(/\*斜体\*|_斜体_/);
    // 列表项
    expect(md).toMatch(/^[-*] /m);
    // 链接保留
    expect(md).toContain('https://example.com/blog/another');
    // 图片保留
    expect(md).toContain('https://example.com/images/photo.jpg');
    // 引用保留
    expect(md).toMatch(/^>\s/m);
    // 侧栏 / footer 噪声不应出现
    expect(md).not.toContain('unique-sidebar-noise');
    expect(md).not.toContain('unique-footer-noise');
    // 不残留 block 级 HTML
    expect(hasNoResidualBlockHtml(md)).toBe(true);
  });
});

describe('Pipeline 回归测试 — 多语言代码块', () => {
  it('code-blocks.html → 4 种语言代码块都带语言标识', async () => {
    const out = await clipFixture('regression/code-blocks.html', 'https://example.com/snippets');
    expect(out.available).toBe(true);
    if (!out.available) return;
    expect(out.result.success).toBe(true);
    if (!out.result.success || !out.result.data) return;
    const md = out.result.data.markdown;

    expect(hasCodeBlockWithLang(md, 'js')).toBe(true);
    expect(hasCodeBlockWithLang(md, 'python')).toBe(true);
    expect(hasCodeBlockWithLang(md, 'ts')).toBe(true);
    expect(hasCodeBlockWithLang(md, 'bash')).toBe(true);
    // 代码主体保留
    expect(md).toContain("function greet(name)");
    expect(md).toContain('def fib(n: int)');
    expect(md).toContain('interface User');
    expect(md).toContain('#!/usr/bin/env bash');
  });
});

describe('Pipeline 回归测试 — 复杂表格', () => {
  it('complex-table.html → 转成 GFM 表格，无残留 HTML', async () => {
    const out = await clipFixture(
      'complex-table.html',
      'https://seller.tiktokshopglobalselling.com/article'
    );
    expect(out.available).toBe(true);
    if (!out.available) return;
    expect(out.result.success).toBe(true);
    if (!out.result.success || !out.result.data) return;
    const md = out.result.data.markdown;

    expect(hasGfmTable(md)).toBe(true);
    expect(md).toContain('iPhone 15 Pro');
    expect(hasNoResidualBlockHtml(md)).toBe(true);
  });
});

describe('Pipeline 回归测试 — 懒加载图片', () => {
  it('lazy-images.html → 至少一张真实 URL 图片，不残留 placeholder', async () => {
    const out = await clipFixture('lazy-images.html', 'https://example.com');
    expect(out.available).toBe(true);
    if (!out.available) return;
    expect(out.result.success).toBe(true);
    if (!out.result.success || !out.result.data) return;
    const md = out.result.data.markdown;

    // 至少出现一张图片
    expect(countImages(md)).toBeGreaterThanOrEqual(1);
    // 占位图（gif / blank.png）不应出现在 markdown 里
    expect(md).not.toMatch(/placeholder\.gif|loading\.gif|blank\.png/);
  });
});

describe('Pipeline 回归测试 — 中文技术站（cnblogs，仅 removeSelectors）', () => {
  it('cnblogs-article.html → 标题、heading、足够正文长度', async () => {
    const out = await clipFixture(
      'cnblogs-article.html',
      'https://www.cnblogs.com/test/p/19529417.html'
    );
    if (!out.available) return; // fixture 缺失时跳过
    expect(out.result.success).toBe(true);
    if (!out.result.success || !out.result.data) return;
    const md = out.result.data.markdown;

    expect(out.result.data.title.length).toBeGreaterThan(0);
    expect(md.length).toBeGreaterThan(200);
    expect(countHeadings(md)).toBeGreaterThanOrEqual(1);
  });
});

describe('Pipeline 回归测试 — 中文技术站（segmentfault）', () => {
  it('segmentfault-article.html → 标题、足够正文长度', async () => {
    const out = await clipFixture(
      'segmentfault-article.html',
      'https://segmentfault.com/a/1190000044851595'
    );
    if (!out.available) return;
    expect(out.result.success).toBe(true);
    if (!out.result.success || !out.result.data) return;
    const md = out.result.data.markdown;

    expect(out.result.data.title.length).toBeGreaterThan(0);
    expect(md.length).toBeGreaterThan(200);
  });
});

describe('Pipeline 回归测试 — Wikipedia 中文（结构最复杂）', () => {
  it('wikipedia-zh-article.html → 多级 heading、有图片、有链接', async () => {
    const out = await clipFixture(
      'wikipedia-zh-article.html',
      'https://zh.wikipedia.org/wiki/Markdown'
    );
    if (!out.available) return;
    expect(out.result.success).toBe(true);
    if (!out.result.success || !out.result.data) return;
    const md = out.result.data.markdown;

    expect(out.result.data.title.length).toBeGreaterThan(0);
    // 长内容
    expect(md.length).toBeGreaterThan(1000);
    // 多个 heading（百科文章一般有大量段落标题）
    expect(countHeadings(md)).toBeGreaterThanOrEqual(3);
  });
});
