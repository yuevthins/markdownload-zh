/**
 * Quick Mode 处理器：一键剪藏 + badge 反馈。
 * 由 background.ts 的 chrome.action.onClicked 调用。
 */

import { clipTab } from '@/lib/clip-flow';
import { showBadgeSuccess, showBadgeError } from '@/lib/badge';
import { getSettings } from '@/utils/settings';
import { generateId, formatDate, formatDateTime } from '@/utils/id';
import { buildMarkdown } from '@/utils/template';
import { sanitizeFilename } from '@/utils/filename';
import { buildObsidianUri } from '@/utils/obsidian-uri';

export async function handleQuickClip(tabId: number, url: string): Promise<void> {
  const result = await clipTab(tabId, url);

  if (!result.success) {
    showBadgeError(tabId);
    return;
  }

  const { data } = result;
  const settings = await getSettings();

  const markdown = buildMarkdown(data, {
    id: generateId(),
    date: formatDate(),
    capturedAt: formatDateTime(),
  });
  const filename = sanitizeFilename(data.title);

  // 保存策略：vault 配置了用 obsidian://，否则文件下载
  if (settings.vaultName) {
    const uriResult = buildObsidianUri({
      content: markdown,
      title: filename,
      vault: settings.vaultName,
      folder: settings.vaultFolder,
    });

    if (uriResult.type === 'clipboard') {
      try {
        // 尝试写剪贴板 + clipboard 模式
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (text: string) => navigator.clipboard.writeText(text),
          args: [uriResult.content],
        });
        // 用 tabs.create 打开 obsidian:// URI（比 tabs.update 更可靠）
        await chrome.tabs.create({ url: uriResult.uri, active: false });
        // 立即关闭刚创建的 tab（obsidian:// 会被系统拦截处理）
        showBadgeSuccess(tabId);
        return;
      } catch {
        // 剪贴板失败，尝试 content URI 模式（有大小限制但不依赖剪贴板）
        try {
          const contentUri = `obsidian://new?file=${encodeURIComponent((settings.vaultFolder ? settings.vaultFolder + '/' : '') + filename)}&vault=${encodeURIComponent(settings.vaultName)}&content=${encodeURIComponent(markdown)}`;
          if (contentUri.length <= 100 * 1024) {
            await chrome.tabs.create({ url: contentUri, active: false });
            showBadgeSuccess(tabId);
            return;
          }
        } catch { /* fall through to file download */ }
      }
    } else if (uriResult.type === 'uri') {
      try {
        await chrome.tabs.create({ url: uriResult.value, active: false });
        showBadgeSuccess(tabId);
        return;
      } catch { /* fall through */ }
    }
  }

  // 文件下载：通过 Content Script 注入到目标页面（绕过 Chrono 拦截）
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (content: string, fname: string) => {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fname;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      args: [markdown, `${filename}.md`],
    });
    showBadgeSuccess(tabId);
  } catch {
    // 降级：chrome.downloads（可能被 Chrono 改名）
    try {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      try {
        await chrome.downloads.download({ url: blobUrl, filename: `${filename}.md`, saveAs: false });
        showBadgeSuccess(tabId);
      } catch {
        showBadgeError(tabId);
      } finally {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      }
    } catch {
      showBadgeError(tabId);
    }
  }
}
