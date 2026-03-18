export default defineBackground(() => {
  console.log('MarkDownload 中文版 已启动');

  // 注册事件监听器，让 Service Worker 保持有效状态
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('MarkDownload 中文版 已安装/更新:', details.reason);
  });
});
