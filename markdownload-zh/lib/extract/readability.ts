/**
 * Readability 封装 + 超时保护
 */
import { Readability } from '@mozilla/readability';

/** 超过此节点数跳过 Readability，直接走后备提取器 */
const MAX_NODE_COUNT = 50_000;

/** 解析前移除的无用标签（减少 Readability 工作量） */
const STRIP_TAGS = ['script', 'style', 'noscript', 'link[rel="stylesheet"]', 'svg'];

/**
 * 精简 DOM：移除对 Readability 无用的节点，降低解析耗时
 */
function trimDOM(doc: Document): void {
  const selector = STRIP_TAGS.join(', ');
  doc.querySelectorAll(selector).forEach((el) => el.remove());
}

/**
 * 使用 Readability 提取正文
 *
 * - 解析前移除 script/style 等无用标签
 * - 节点数超过阈值时直接返回 null（由调用方走后备提取器）
 * - 包含 performance.now() 计时预警
 */
export function readabilityExtract(
  doc: Document
): { title: string; content: string; siteName: string } | null {
  // 精简 DOM（减少 Readability 处理量）
  trimDOM(doc);

  // 节点数阈值检查
  const nodeCount = doc.getElementsByTagName('*').length;
  if (nodeCount > MAX_NODE_COUNT) {
    console.warn(
      `[Markdownload] DOM 节点数 ${nodeCount} 超过阈值 ${MAX_NODE_COUNT}，跳过 Readability`
    );
    return null;
  }

  const reader = new Readability(doc, {
    debug: false,
    charThreshold: 50,
  });

  const startTime = performance.now();
  const article = reader.parse();
  const elapsed = performance.now() - startTime;

  if (elapsed > 3000) {
    console.warn(`[Markdownload] Readability.parse() took ${elapsed.toFixed(0)}ms (>3s warning)`);
  }

  if (!article || !article.content) {
    return null;
  }

  return {
    title: article.title || '',
    content: article.content,
    siteName: article.siteName || '',
  };
}
