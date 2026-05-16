/**
 * defuddle 包装器：调用 defuddle 引擎完成"提取 + Markdown 转换"。
 *
 * 使用 `defuddle/full` 入口，因为：
 * - 核心 bundle (`defuddle`) 不带 Markdown 转换（`markdown: true` 会被静默忽略）
 * - `defuddle/full` 在浏览器和 vitest+jsdom 测试环境中都可用
 * - `defuddle/node` 仅适合 Node 脚本场景，不能打进浏览器扩展 bundle
 */
import Defuddle, { createMarkdownContent } from 'defuddle/full';

export interface DefuddleResult {
  title: string;
  markdown: string;
  siteName?: string;
}

export interface DefuddleOptions {
  /** 当设置时，绕过 defuddle 自动正文识别，直接使用此 CSS 选择器锁定主体区域 */
  contentSelector?: string;
}

/**
 * 用 defuddle 提取并转换为 Markdown。
 *
 * 失败（content 为空）时返回 null，调用方可走后备路径。
 */
export function defuddleExtract(
  doc: Document,
  url: string,
  options: DefuddleOptions = {}
): DefuddleResult | null {
  const startTime = performance.now();

  const defuddle = new Defuddle(doc, {
    markdown: true,
    url,
    ...(options.contentSelector ? { contentSelector: options.contentSelector } : {}),
  });

  const result = defuddle.parse();
  const elapsed = performance.now() - startTime;

  if (elapsed > 3000) {
    console.warn(`[Markdownload] defuddle.parse() took ${elapsed.toFixed(0)}ms (>3s warning)`);
  }

  if (!result || !result.content || !result.content.trim()) {
    return null;
  }

  return {
    title: result.title || '',
    markdown: result.content,
    siteName: result.site || '',
  };
}

/**
 * 把已经清洗过的 HTML 片段转为 Markdown。
 *
 * 用于 customExtract 适配器（飞书 / Reddit 等）和 fallback 提取器，
 * 避免引入第二个 HTML→Markdown 引擎（删除 lib/convert/ 后唯一的转换通道）。
 *
 * 注意：底层 `createMarkdownContent` 仍包含 defuddle 的 HTML 标准化逻辑，
 * 因此正文最前面的 `<h1>` 若与文档标题重复会被剥离 —— 与 defuddle 通用提取
 * 路径行为一致（标题统一从 frontmatter 走，正文不再重复）。
 */
export function htmlToMarkdown(html: string, url: string): string {
  return createMarkdownContent(html, url);
}
