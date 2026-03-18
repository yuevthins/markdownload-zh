/**
 * 主管线 orchestrator
 *
 * 组合四个阶段：Preprocess → Extract → Convert → Format
 */
import type { PipelineResult } from './types';
import { getSiteAdapter } from './sites';
import { preprocessDOM } from './preprocess';
import { extractContent } from './extract';
import { convertToMarkdown } from './convert';
import { formatMarkdown } from './format';
import { detectDocFramework } from './sites/adapters/generic-docs';

/**
 * 运行完整的提取管线
 *
 * @param doc 工作文档（克隆后的，用于 DOM 变更）
 * @param url 页面 URL
 * @param sourceDoc 原始文档（可选，用于 Shadow DOM 读取）
 */
export async function runPipeline(
  doc: Document,
  url: string,
  sourceDoc?: Document
): Promise<PipelineResult> {
  try {
    // 获取站点适配器（URL 匹配 + DOM 检测）
    let adapter = getSiteAdapter(url, doc);

    // Stage 1: Preprocess（失败不中断）
    try {
      await preprocessDOM(doc, url, adapter);
    } catch (e) {
      console.warn('[Markdownload] Stage 1 (preprocess) failed:', e);
    }

    // 如果 URL 没匹配到适配器，preprocess 后再用 DOM 检测一次
    if (!adapter) {
      const docAdapter = detectDocFramework(doc);
      if (docAdapter) {
        adapter = docAdapter;
        // 补充执行文档框架的 removeSelectors
        if (adapter.removeSelectors && adapter.removeSelectors.length > 0) {
          try {
            doc.querySelectorAll(adapter.removeSelectors.join(', ')).forEach((el) => el.remove());
          } catch (e) {
            console.warn('[Markdownload] doc framework removeSelectors failed:', e);
          }
        }
      }
    }

    // Stage 2: Extract（核心阶段，传入 sourceDoc 供 Shadow DOM 站点使用）
    const extracted = await extractContent(doc, url, adapter, sourceDoc);
    if (!extracted) {
      return { success: false, error: 'NO_CONTENT' };
    }

    // Stage 3: Convert（传入 url 用于懒加载图片相对路径归一化）
    const markdown = convertToMarkdown(extracted.html, url);

    // Stage 4: Format
    const formatted = formatMarkdown(markdown);

    return {
      success: true,
      data: {
        title: extracted.title || doc.title || 'Untitled',
        markdown: formatted,
        url,
        siteName: extracted.siteName,
      },
    };
  } catch (error) {
    console.error('[Markdownload] Pipeline error:', error);
    return {
      success: false,
      error: 'EXTRACTION_FAILED',
    };
  }
}
