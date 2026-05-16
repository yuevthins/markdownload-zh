/**
 * Badge 反馈：快速模式下通过扩展图标 badge 显示剪藏结果。
 * ✓ 绿色 2s = 成功，✗ 红色 3s = 失败。
 */

export const BADGE_COLORS = {
  success: '#0E8A16',
  failure: '#CB2431',
} as const;

export function showBadgeSuccess(tabId: number): void {
  chrome.action.setBadgeText({ text: '✓', tabId });
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.success, tabId });
  setTimeout(() => chrome.action.setBadgeText({ text: '', tabId }), 2000);
}

export function showBadgeError(tabId: number): void {
  chrome.action.setBadgeText({ text: '✗', tabId });
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.failure, tabId });
  setTimeout(() => chrome.action.setBadgeText({ text: '', tabId }), 3000);
}
