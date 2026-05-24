/**
 * 主管线 orchestrator
 *
 * 阶段：Preprocess → Extract → Format
 *
 * defuddle 引擎统一在 Extract 阶段产出 Markdown：
 *  - 通用页面：defuddle 直接提取 + 转换
 *  - customExtract / 后备：返回 HTML 后由 defuddle 的 htmlToMarkdown 转换
 *
 * 因此管线不再需要单独的 Convert 阶段。
 */
import type { PipelineResult } from './types';
import { getSiteAdapter } from './sites';
import { preprocessDOM } from './preprocess';
import { extractContent } from './extract';
import { formatMarkdown } from './format';
import { detectDocFramework } from './sites/adapters/generic-docs';

/**
 * 运行完整的提取管线
 *
 * @param doc 工作文档（克隆后的，用于 DOM 变更）
 * @param url 页面 URL
 * @param sourceDoc 原始文档（可选，用于 Shadow DOM 读取）
 * @param onMark 可选打点回调（诊断用），各阶段结束时触发
 */
export async function runPipeline(
  doc: Document,
  url: string,
  sourceDoc?: Document,
  onMark?: (name: string) => void
): Promise<PipelineResult> {
  const mark = onMark || (() => {});
  const t0 = Date.now();
  const stages: Record<string, number> = {};

  try {
    mark('pl_start');
    // 获取站点适配器（URL 匹配 + DOM 检测）
    let adapter = getSiteAdapter(url, doc);
    const tAdapter = Date.now();
    stages.adapter = tAdapter - t0;
    mark('pl_adapter');

    // Stage 1: Preprocess（失败不中断）
    try {
      await preprocessDOM(doc, url, adapter);
    } catch (e) {
      console.warn('[Markdownload] Stage 1 (preprocess) failed:', e);
    }
    const tPreprocess = Date.now();
    stages.preprocess = tPreprocess - tAdapter;
    mark('pl_preprocess');

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
    const tExtract = Date.now();
    stages.extract = tExtract - tPreprocess;
    mark('pl_extract');
    if (!extracted) {
      return {
        success: false,
        error: 'NO_CONTENT',
        diagnostics: { adapter: adapter?.id ?? null, stages, contentLength: 0 },
      };
    }

    // Stage 3: Format
    const formatted = formatMarkdown(extracted.markdown);
    stages.format = Date.now() - tExtract;
    mark('pl_format');

    return {
      success: true,
      data: {
        title: extracted.title || doc.title || 'Untitled',
        markdown: formatted,
        url,
        siteName: extracted.siteName,
      },
      diagnostics: {
        adapter: adapter?.id ?? null,
        stages,
        contentLength: formatted.length,
      },
    };
  } catch (error) {
    console.error('[Markdownload] Pipeline error:', error);
    return {
      success: false,
      error: 'EXTRACTION_FAILED',
      diagnostics: { adapter: null, stages, contentLength: 0 },
    };
  }
}
