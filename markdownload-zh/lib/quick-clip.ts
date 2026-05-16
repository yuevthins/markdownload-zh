/**
 * Quick Mode 处理器：一键剪藏 + badge 反馈。
 * 由 background.ts 的 chrome.action.onClicked 调用。
 */

import { clipTab } from '@/lib/clip-flow';
import { showBadgeSuccess, showBadgeError } from '@/lib/badge';
import { getSettings } from '@/utils/settings';
import { generateId, formatDate, formatDateTime } from '@/utils/id';
import { renderTemplate, DEFAULT_TEMPLATE } from '@/utils/template';
import { sanitizeFilename } from '@/utils/filename';
import { buildObsidianUri } from '@/utils/obsidian-uri';
import type { TemplateData } from '@/types';

export async function handleQuickClip(tabId: number, url: string): Promise<void> {
  const result = await clipTab(tabId, url);

  if (!result.success) {
    showBadgeError(tabId);
    return;
  }

  const { data } = result;
  const settings = await getSettings();

  // 生成完整 Markdown（含 Frontmatter）
  const templateData: TemplateData = {
    title: data.title,
    url: data.url,
    date: formatDate(),
    id: generateId(),
    content: data.markdown,
    siteName: data.siteName,
    capturedAt: formatDateTime(),
  };
  const markdown = renderTemplate(DEFAULT_TEMPLATE, templateData);
  const filename = sanitizeFilename(data.title);

  // 保存策略：vault 配置了用 obsidian://，否则文件下载
  if (settings.vaultName) {
    const uriResult = buildObsidianUri({
      content: markdown,
      title: filename,
      vault: settings.vaultName,
      folder: settings.vaultFolder,
    });

    if (uriResult.type === 'uri') {
      await chrome.tabs.update(tabId, { url: uriResult.value });
      showBadgeSuccess(tabId);
      return;
    }
    // fallback: too-large → 文件下载
  }

  // 文件下载
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
}
