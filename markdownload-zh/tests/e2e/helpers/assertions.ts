import { expect } from '@playwright/test';

export interface ExtractionResult {
  success: boolean;
  data?: {
    title: string;
    markdown: string;
    url?: string;
    siteName?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 基础断言：提取成功且有内容
 */
export function assertBasicExtraction(result: ExtractionResult, minChars = 100): void {
  expect(result.success, '提取应该成功').toBe(true);
  expect(result.data, '应该有提取数据').toBeDefined();
  expect(result.data!.title, '标题不应为空').toBeTruthy();
  expect(result.data!.title.length, '标题应有内容').toBeGreaterThan(0);
  expect(result.data!.markdown, 'Markdown 不应为空').toBeTruthy();
  expect(result.data!.markdown.length, `Markdown 应至少有 ${minChars} 字符`).toBeGreaterThan(minChars);
}

/**
 * 格式断言：无残留 HTML
 */
export function assertNoResidualHtml(markdown: string): void {
  // 常见 HTML 标签不应出现在最终输出中
  const htmlPatterns = [
    /<div\b/i,
    /<span\b/i,
    /<p\b/i,
    /<table\b/i,
    /<tr\b/i,
    /<td\b/i,
    /<script\b/i,
    /<style\b/i,
    /<iframe\b/i,
  ];

  for (const pattern of htmlPatterns) {
    expect(markdown, `不应包含 HTML 标签: ${pattern}`).not.toMatch(pattern);
  }
}

/**
 * Frontmatter 断言
 */
export function assertFrontmatter(markdown: string): void {
  expect(markdown, '应以 Frontmatter 开头').toMatch(/^---\n/);
  expect(markdown, '应有 Frontmatter 结束标记').toMatch(/\n---\n/);

  // 提取 frontmatter 内容
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  expect(frontmatterMatch, '应能解析 Frontmatter').toBeTruthy();

  const frontmatter = frontmatterMatch![1];

  // 检查必要字段
  expect(frontmatter, '应有 title 字段').toMatch(/title:/);
  expect(frontmatter, '应有 id 字段').toMatch(/id:/);
  expect(frontmatter, '应有 source 字段').toMatch(/source:/);
}

/**
 * 图片断言：检查图片链接有效性
 */
export function assertValidImages(markdown: string): void {
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images = [...markdown.matchAll(imagePattern)];

  for (const [, alt, src] of images) {
    expect(src, `图片 src 应有效: ${alt}`).toMatch(/^https?:\/\//);
    // 不应该是占位符
    expect(src, '不应是占位符 URL').not.toMatch(/placeholder|data:image\/gif/i);
  }
}

/**
 * 代码块断言
 */
export function assertCodeBlocks(markdown: string): void {
  const hasCodeBlock = /```[\s\S]*?```/.test(markdown);
  expect(hasCodeBlock, '应包含代码块').toBe(true);
}

/**
 * 站点特定断言配置
 */
export const siteAssertions: Record<
  string,
  {
    minChars: number;
    requireCodeBlocks?: boolean;
    requireImages?: boolean;
    customCheck?: (markdown: string) => void;
  }
> = {
  zhihu: {
    minChars: 500,
    requireCodeBlocks: false, // 不是所有知乎文章都有代码
    requireImages: true,
  },
  wechat: {
    minChars: 300,
    requireImages: true,
  },
  csdn: {
    minChars: 200,
    requireCodeBlocks: false,
  },
  cnblogs: {
    minChars: 200,
  },
  reddit: {
    minChars: 20, // Reddit 帖子可能很短
  },
  woshipm: {
    minChars: 300,
    requireImages: true,
  },
};

/**
 * 综合断言：运行所有适用的断言
 */
export function assertExtraction(
  result: ExtractionResult,
  site: keyof typeof siteAssertions
): void {
  const config = siteAssertions[site] || { minChars: 100 };

  // 基础断言
  assertBasicExtraction(result, config.minChars);

  const markdown = result.data!.markdown;

  // 格式断言
  assertNoResidualHtml(markdown);
  assertFrontmatter(markdown);

  // 可选断言
  if (config.requireImages) {
    assertValidImages(markdown);
  }

  if (config.requireCodeBlocks) {
    assertCodeBlocks(markdown);
  }

  // 自定义检查
  if (config.customCheck) {
    config.customCheck(markdown);
  }
}
