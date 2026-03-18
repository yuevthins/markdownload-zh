/**
 * 内容提取 Content Script
 *
 * 此脚本通过 chrome.scripting.executeScript 程序化注入。
 * 所有业务逻辑已迁移到 lib/ 模块，此文件仅作为入口。
 *
 * 结果通过 window.__markdownload_extracted 传递，
 * 包含 requestId 用于防止读取过期结果。
 */
import { runPipeline } from '@/lib/pipeline';

export default defineUnlistedScript(async () => {
  // 读取 Popup 设置的 requestId（用于防竞态）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestId = (window as any).__markdownload_requestId || '';

  const result = await runPipeline(
    document.cloneNode(true) as Document,
    window.location.href,
    document // 原始文档，供 Shadow DOM 站点读取 shadowRoot
  );

  window.__markdownload_extracted = {
    requestId,
    success: result.success,
    data: result.data,
    error: result.error
      ? { code: result.error as 'NO_CONTENT' | 'EXTRACTION_FAILED', message: result.error === 'NO_CONTENT' ? '无法提取文章内容，页面可能不包含可读文章' : '提取失败' }
      : undefined,
  };
});
