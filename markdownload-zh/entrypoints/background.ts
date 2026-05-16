import { getSettings, onSettingsChanged } from '@/utils/settings';
import { applyPopupForMode } from '@/utils/popup-mode';
import { handleQuickClip } from '@/lib/quick-clip';

export default defineBackground(() => {
  console.log('MarkDownload 中文版 已启动');

  // 启动时根据当前 settings.mode 同步 chrome.action 的 popup 状态
  void getSettings()
    .then((settings) => applyPopupForMode(settings.mode))
    .catch((e) => console.warn('[Markdownload] applyPopupForMode (boot) failed:', e));

  // 设置变化时实时切换 popup
  onSettingsChanged((settings) => {
    void applyPopupForMode(settings.mode).catch((e) =>
      console.warn('[Markdownload] applyPopupForMode (change) failed:', e)
    );
  });

  // Quick Mode：无 popup 时 onClicked 触发一键剪藏
  chrome.action.onClicked.addListener((tab) => {
    if (!tab.id || !tab.url) return;
    void handleQuickClip(tab.id, tab.url);
  });

  chrome.runtime.onInstalled.addListener((details) => {
    console.log('MarkDownload 中文版 已安装/更新:', details.reason);
    void getSettings()
      .then((settings) => applyPopupForMode(settings.mode))
      .catch((e) => console.warn('[Markdownload] applyPopupForMode (install) failed:', e));
  });
});
