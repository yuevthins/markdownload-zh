/**
 * 共享剪藏流程：注入 extractor → 轮询结果 → 返回提取数据。
 * 被 popup/main.ts 和 background.ts (quick mode) 共用。
 */

import type { ExtractResult, ExtractedData } from '@/types';

export type ClipResult =
  | { success: true; data: ExtractedData }
  | { success: false; error: { code: string; message: string } };

const RESTRICTED_PROTOCOLS = ['chrome://', 'chrome-extension://', 'edge://', 'brave://', 'about:', 'file://'];
const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 30_000;
const MAX_POLL_ATTEMPTS = Math.floor(POLL_TIMEOUT_MS / POLL_INTERVAL_MS);

/**
 * 对指定 tab 执行完整剪藏流程：注入 → 轮询 → 返回结果。
 */
export async function clipTab(tabId: number, url: string): Promise<ClipResult> {
  if (RESTRICTED_PROTOCOLS.some((p) => url.startsWith(p))) {
    return { success: false, error: { code: 'PAGE_NOT_ACCESSIBLE', message: '无法在此页面使用扩展' } };
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    // 清除旧结果 + 写入 requestId
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (rid: string) => {
        delete window.__markdownload_extracted;
        window.__markdownload_requestId = rid;
      },
      args: [requestId],
    });

    // 注入 extractor
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['extractor.js'],
    });
  } catch (e) {
    return { success: false, error: { code: 'PAGE_NOT_ACCESSIBLE', message: (e as Error).message } };
  }

  // 轮询等待结果
  const result = await pollForResult(tabId, requestId);

  if (!result || !result.success || !result.data) {
    return {
      success: false,
      error: result?.error || { code: 'TIMEOUT', message: '提取超时' },
    };
  }

  return { success: true, data: result.data };
}

async function pollForResult(tabId: number, requestId: string): Promise<ExtractResult | undefined> {
  const readResult = async (): Promise<ExtractResult | null> => {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (expectedId: string) => {
        const result = window.__markdownload_extracted;
        if (result && result.requestId === expectedId) {
          delete window.__markdownload_extracted;
          delete window.__markdownload_requestId;
          return result;
        }
        return null;
      },
      args: [requestId],
    });
    return results[0]?.result as ExtractResult | null;
  };

  return new Promise<ExtractResult | undefined>((resolve) => {
    let settled = false;
    const settle = (r: ExtractResult | undefined) => {
      if (settled) return;
      settled = true;
      chrome.runtime.onMessage.removeListener(messageListener);
      resolve(r);
    };

    const messageListener = (msg: unknown) => {
      const m = msg as { type?: string; requestId?: string } | null;
      if (m?.type === '__markdownload_done' && m?.requestId === requestId) {
        readResult().then((r) => settle(r || undefined));
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    (async () => {
      for (let i = 0; i < MAX_POLL_ATTEMPTS && !settled; i++) {
        const r = await readResult();
        if (r) { settle(r); return; }
        await new Promise((w) => setTimeout(w, POLL_INTERVAL_MS));
      }
      settle(undefined);
    })();
  });
}
