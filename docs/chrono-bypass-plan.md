# MarkDownload 中文版：绕过 Chrono 下载管理器方案（已验证生效）

## 问题描述

同时安装 Chrono 下载管理器和 MarkDownload 中文版时，MarkDownload 下载的 `.md` 文件会被 Chrono 拦截并重命名为 UUID（如 `ae29f5e8-1234-5678.md`），丢失中文标题。

## 问题根因

MarkDownload 原来的下载流程：

```
popup 中创建 Blob → URL.createObjectURL(blob) → chrome.downloads.download({ url: blobUrl })
```

产生的 blob URL 形如 `blob:chrome-extension://jdpcfhjl.../ae29f5e8-...`，其中只有 UUID，没有可读文件名。

Chrono 的拦截链：
1. `downloads.onCreated` → Chrono 的 `dc()` 将下载 ID 加入追踪列表
2. `downloads.onDeterminingFilename` → Chrono 的 `da()` → `l()` 从 URL 中解析 UUID 作为文件名
3. 最终文件名 = UUID.md，而非 MarkDownload 传入的中文标题

## 已验证生效的方案：Content Script 注入下载

**核心思路**：不在 popup 上下文中下载，改为通过 `chrome.scripting.executeScript()` 将下载逻辑注入到**目标网页**中执行。

**为什么能绕过 Chrono**：
- 在网页上下文中创建的 blob URL origin 是网页域名：`blob:https://mp.weixin.qq.com/...`
- 而非扩展域名：`blob:chrome-extension://jdpcfhjl.../...`
- Chrono 的 `dc()` onCreated 处理器找不到匹配的任务 → 不拦截 → 保留 `<a download>` 属性指定的文件名

**用户体验**：与以前一样，点击下载按钮直接下载，无弹窗，文件名正确保留中文标题。

---

## 修改的文件清单

### 1. `entrypoints/popup/main.ts`（源码）和 `chunks/popup-C8uNASKZ.js`（构建产物）

**改动**：重写 `handleDownload()` 函数

**改动前**（原逻辑）：
```typescript
async function handleDownload() {
  // 在 popup 中创建 Blob URL → chrome.downloads.download()
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const downloadId = await chrome.downloads.download({
    url: blobUrl,
    filename: `${filename}.md`,
    saveAs: false,
  });
  // ... Chrono 拦截这个下载并把文件名改成 UUID
}
```

**改动后**（Content Script 注入 + 降级链）：
```typescript
async function handleDownload() {
  if (!currentData) return;

  const title = titleInput.value || currentData.title || 'untitled';
  const filename = sanitizeFilename(title);
  const markdown = getFullMarkdown();

  // ===== 优先：Content Script 注入下载（绕过 Chrono）=====
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) throw new Error('无法获取标签页');

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
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
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      args: [markdown, `${filename}.md`],
    });

    updateStatus('✅ 下载成功');
    return;
  } catch (err) {
    console.warn('[MarkDownload] Content Script 注入下载失败, 降级:', err);
  }

  // ===== 降级 1：chrome.downloads（可能被 Chrono 改名）=====
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const downloadId = await chrome.downloads.download({
      url: blobUrl, filename: `${filename}.md`, saveAs: false,
    });
    // ... 事件驱动释放 Blob URL ...
  } catch {
    // ===== 降级 2：<a download> 兜底 =====
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  }
}
```

**关键点**：
- `chrome.scripting.executeScript({ func, args })` 直接注入匿名函数，不需要额外的 content script 文件
- 已有 `activeTab` + `scripting` 权限，`manifest.json` 不需要改动
- 降级链保证即使注入失败也能下载（只是可能被 Chrono 改名）

### 2. `entrypoints/background.ts`（源码）和 `background.js`（构建产物）

**改动**：添加 `onInstalled` 监听器修复 Service Worker 无效问题 + 清理无效代码

**改动前**：
```typescript
export default defineBackground(() => {
  console.log('MarkDownload 中文版 已启动');
  // 没有任何事件监听器 → Chrome 标记 Service Worker 为「无效」
});
```

**改动后**：
```typescript
export default defineBackground(() => {
  console.log('MarkDownload 中文版 已启动');
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('MarkDownload 中文版 已安装/更新:', details.reason);
  });
});
```

**注意**：之前尝试过在 background.js 中添加 `onDeterminingFilename` 监听器，已验证无效（Chrono 优先级更高），已清理掉。

### 3. `utils/filename.ts`（源码）

**改动**：文件名长度限制从 50 字符提升到 200 字符

```typescript
// 改动前
if (sanitized.length > 50) {
  sanitized = sanitized.substring(0, 50).trim().replace(/-+$/, '');
}

// 改动后
if (sanitized.length > 200) {
  sanitized = sanitized.substring(0, 200).trim().replace(/-+$/, '');
}
```

---

## 已验证失败的方案（不要再尝试）

**`onDeterminingFilename` 监听器方案**：在 background.js 中注册 `chrome.downloads.onDeterminingFilename` 监听器，试图抢在 Chrono 之前 `suggest()` 正确文件名。

失败原因：Chrome 的 `onDeterminingFilename` 只允许一个扩展调用 `suggest()`（最后注册的优先）。Chrono 始终优先。

---

## 其他电脑上的部署步骤

### 方式一：直接修改构建产物（快速）

1. 找到 `markdownload-zh-extension/` 目录
2. 编辑 `chunks/popup-C8uNASKZ.js`，将 `handleDownload` 函数（代码中叫 `F`）替换为上述 Content Script 注入版本
3. 编辑 `background.js`，确保有 `onInstalled` 监听器，删除 `onDeterminingFilename` 相关代码
4. Chrome `chrome://extensions/` → MarkDownload → 点击「重新加载」

### 方式二：从源码构建（推荐）

1. 确保 `markdownload-zh/entrypoints/popup/main.ts` 中 `handleDownload()` 已改为 Content Script 注入版本
2. 确保 `markdownload-zh/entrypoints/background.ts` 有 `onInstalled` 监听器
3. 确保 `markdownload-zh/utils/filename.ts` 长度限制为 200
4. 执行：
```bash
cd markdownload-zh/
npm install
npm run build
cp -r .output/chrome-mv3/* ../markdownload-zh-extension/
```
5. Chrome `chrome://extensions/` → MarkDownload → 点击「重新加载」

### 通用注意事项

- 如果同时装了两个 MarkDownload 中文版，只保留一个
- Chrono 不需要做任何修改，保持启用即可
- `chrome.scripting.executeScript` 需要 Chrome 88+（2021 年 1 月起），所有现代 Chrome 均支持
