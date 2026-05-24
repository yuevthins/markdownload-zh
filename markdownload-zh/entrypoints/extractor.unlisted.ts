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
import type { ExtensionMessage } from '@/types';

export default defineUnlistedScript(async () => {
  const marks: Record<string, number> = {};
  const mark = (name: string) => {
    marks[name] = Date.now();
  };

  mark('ex_start');

  // 读取 Popup 设置的 requestId（用于防竞态）
  const requestId = window.__markdownload_requestId || '';

  const cloned = document.cloneNode(true) as Document;
  mark('ex_clone_done');

  const result = await runPipeline(
    cloned,
    window.location.href,
    document, // 原始文档，供 Shadow DOM 站点读取 shadowRoot
    mark
  );
  mark('ex_pipeline_done');

  window.__markdownload_extracted = {
    requestId,
    success: result.success,
    data: result.data,
    error: result.error
      ? { code: result.error as 'NO_CONTENT' | 'EXTRACTION_FAILED', message: result.error === 'NO_CONTENT' ? '无法提取文章内容，页面可能不包含可读文章' : '提取失败' }
      : undefined,
    _perf: { ...marks, ...(result.diagnostics?.stages ?? {}) },
  };

  // 通知 Popup 提取完成（事件驱动，比轮询更快）
  try {
    const msg: ExtensionMessage = { type: '__markdownload_done', requestId };
    chrome.runtime.sendMessage(msg);
  } catch {
    // chrome.runtime 在某些注入上下文中不可用，回退到轮询
  }
});
