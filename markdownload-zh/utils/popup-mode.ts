/**
 * 把 settings.mode 映射到 chrome.action 的 popup 文件名，并提供副作用包装。
 *
 * - preview / obsidian → "popup.html"（保留弹窗）
 * - quick              → ""（移除 popup，转由 background.ts 的 onClicked 处理）
 */
import type { Mode } from './settings';

export function popupFileForMode(mode: Mode): string {
  return mode === 'quick' ? '' : 'popup.html';
}

/**
 * 把当前 mode 应用到 chrome.action.setPopup。
 * 在缺失 chrome.action.setPopup 的环境（比如旧版 / 测试桩）下静默跳过。
 */
export async function applyPopupForMode(mode: Mode): Promise<void> {
  const setPopup = (chrome as { action?: { setPopup?: (d: { popup: string }) => Promise<void> } })
    .action?.setPopup;
  if (typeof setPopup !== 'function') return;
  await setPopup({ popup: popupFileForMode(mode) });
}
