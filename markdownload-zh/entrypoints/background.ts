import { getSettings, onSettingsChanged } from '@/utils/settings';
import { applyPopupForMode } from '@/utils/popup-mode';

export default defineBackground(() => {
  console.log('MarkDownload 中文版 已启动');

  // 启动时根据当前 settings.mode 同步 chrome.action 的 popup 状态
  // （quick 模式 → 无 popup → 走 onClicked；preview / obsidian → 保留 popup.html）
  void getSettings()
    .then((settings) => applyPopupForMode(settings.mode))
    .catch((e) => console.warn('[Markdownload] applyPopupForMode (boot) failed:', e));

  // 设置变化时实时切换 popup
  onSettingsChanged((settings) => {
    void applyPopupForMode(settings.mode).catch((e) =>
      console.warn('[Markdownload] applyPopupForMode (change) failed:', e)
    );
  });

  // 注册事件监听器，让 Service Worker 保持有效状态
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('MarkDownload 中文版 已安装/更新:', details.reason);
    // 安装/更新时也同步一次 popup 状态
    void getSettings()
      .then((settings) => applyPopupForMode(settings.mode))
      .catch((e) => console.warn('[Markdownload] applyPopupForMode (install) failed:', e));
  });
});
