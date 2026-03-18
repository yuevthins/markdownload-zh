# CLAUDE.md

> 📊 统计: 决策 5 | 陷阱 5 | 模式 1 | 命令 0
> 🕐 最后更新: 2026-02-07
> 📝 事件日志: .claude/events.ndjson

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 用户偏好

- **语言**：使用中文回复
- **称呼**：每次回复时称呼用户为 "BigCongCong"

## 项目概述

MarkDownload 中文版是一个 Chrome 浏览器扩展，用于将网页内容剪藏为 Markdown 文件，专为 Obsidian 用户优化。

**技术栈**：WXT 框架 + TypeScript + Chrome MV3 + Readability.js + Turndown

**权限模型**：仅使用 `activeTab` + `scripting` + `downloads`，按需注入，无全站权限。

## 常用命令

```bash
npm run dev      # 开发模式（热重载）
npm run build    # 生产构建，输出到 .output/chrome-mv3/
npm test         # 运行所有测试
npm test -- utils/filename.test.ts  # 运行单个测试文件
npm run lint     # ESLint 检查
npm run format   # Prettier 格式化
```

## 架构

### 数据流

```
用户点击扩展图标
    ↓
Popup 打开 → init()
    ↓
chrome.scripting.executeScript({ files: ['extractor.js'] })
    ↓
extractor.unlisted.ts 在目标页面执行
    ├── Readability.js 提取正文
    ├── Turndown + GFM 转 Markdown
    └── 结果存入 window.__markdownload_extracted
    ↓
Popup 读取结果 → 渲染预览
    ↓
用户点击下载 → Blob URL 下载
```

### 入口点结构

| 文件 | 角色 | 说明 |
|------|------|------|
| `entrypoints/popup/` | Popup 界面 | 主交互入口，包含 HTML/CSS/main.ts |
| `entrypoints/extractor.unlisted.ts` | 内容提取器 | 入口文件（~15行），调用 `lib/pipeline.ts` |
| `entrypoints/background.ts` | Service Worker | 极简版，仅处理安装事件 |

### 核心业务逻辑 (lib/)

```
lib/
├── pipeline.ts               # 主管线 orchestrator
├── types.ts                   # SiteAdapter 等内部类型
├── preprocess/                # Stage 1: DOM 预处理
│   ├── index.ts               # preprocessDOM(doc, url, adapter)
│   ├── lazy-images.ts         # 懒加载图片（13 种 data-*）
│   ├── tables.ts              # 表格归一化（rowspan/colspan）
│   ├── video-players.ts       # 视频播放器移除
│   ├── links.ts               # mergeSplitLinks + TikTok 处理
│   └── dom-utils.ts           # safeQuerySelectorAll 等
├── sites/                     # 站点适配器
│   ├── index.ts               # getSiteAdapter(url, doc?)
│   ├── registry.ts            # 注册表 + 匹配逻辑
│   ├── helpers.ts             # createNewsAdapter() 等工厂函数
│   └── adapters/
│       ├── wechat.ts          # 微信公众号
│       ├── zhihu.ts           # 知乎
│       ├── csdn.ts            # CSDN
│       ├── reddit.ts          # Reddit（Shadow DOM）
│       ├── qq-news.ts         # 腾讯新闻
│       ├── tiktok-shop.ts     # TikTok Shop
│       ├── chinese-tech.ts    # 中文技术社区集合
│       ├── news.ts            # 新闻站点集合
│       ├── tech-blogs.ts      # 技术博客集合
│       ├── generic-docs.ts    # GitBook/Docusaurus 等
│       └── _simple.ts         # 其余简单站点
├── extract/                   # Stage 2: 内容提取
│   ├── index.ts               # extractContent(doc, url, adapter)
│   ├── readability.ts         # Readability 封装 + 超时保护
│   └── fallback.ts            # 后备提取器
├── convert/                   # Stage 3: HTML → Markdown
│   ├── index.ts               # convertToMarkdown(html)
│   ├── turndown-factory.ts    # Turndown 实例 + 自定义规则
│   └── smart-alt.ts           # 智能 alt 提取
└── format/                    # Stage 4: 后处理
    ├── index.ts               # formatMarkdown(markdown)
    └── cleanup.ts             # 零宽字符、空行压缩
```

### 工具模块 (utils/)

| 模块 | 职责 |
|------|------|
| `id.ts` | ID 生成（YYYYMMDD-xxxx）和日期格式化 |
| `filename.ts` | 文件名清理（Windows 保留名、特殊字符） |
| `template.ts` | Frontmatter 模板渲染 |
| `lazy-image.ts` | 懒加载图片处理（13 种 data-* 属性） |
| `text-cleanup.ts` | 文本清理（零宽字符、alt 占位符检测） |

## 关键设计决策

### 程序化注入 vs Content Script

由于使用 `activeTab` 权限，无法声明式注册 content script。采用程序化注入：
- `extractor.unlisted.ts` 编译为独立 JS 文件
- 通过 `chrome.scripting.executeScript({ files: [...] })` 按需注入
- 结果通过 `window.__markdownload_extracted` 全局变量传递

### Blob 下载

优先使用 `chrome.downloads.download()` + `onChanged` 事件驱动释放 Blob URL。回退方案：`<a download>` + 10s 延迟释放。

### 会话级 ID

每次打开 Popup 时生成一次 ID，用户编辑标题不会改变 ID。

### 懒加载图片处理

支持 13 种常见的懒加载属性：`data-src`, `data-original`, `data-actualsrc`, `data-srcset` 等。

## 站点适配

使用 Pipeline + Site Adapter 架构。每个站点的全部配置集中在一个 `SiteAdapter` 对象中。

**扩展新站点时**，在 `lib/sites/adapters/` 下创建适配器文件，注册到 `lib/sites/index.ts`。

适配器接口：
```typescript
interface SiteAdapter {
  id: string;
  match: string | RegExp | ((url: string) => boolean);
  removeSelectors?: string[];           // Stage 1: 要移除的 DOM 元素
  preprocess?: (doc, url) => void;      // Stage 1: 自定义预处理
  fallbackSelectors?: string[];         // Stage 2: 后备提取选择器
  customExtract?: (doc, url) => {...};  // Stage 2: 自定义提取
  siteName?: string;
}
```

## 文本清理

Turndown 转换后自动清理：
- **零宽字符**：`\u200B`/`\u200C`/`\u200D`/`\uFEFF`
- **图片 alt 智能提取**：alt → data-alt → title → aria-label → figcaption

## Frontmatter 格式

生成的 Markdown 文件符合 Obsidian Vault 规范：

```yaml
---
title: "文章标题"
id: 20260124-a3f9
created: 2026-01-24
updated: 2026-01-24
captured: 2026-01-24 17:30:00
status: draft
category: resource
tags:
  - 收藏
source: https://example.com/article
site: example.com
---
```

## 测试

使用 Vitest，测试文件与源文件同目录（`*.test.ts`）。

测试环境使用 jsdom 模拟浏览器 DOM。

## 构建产物

生产构建输出到 `.output/chrome-mv3/`，可直接在 Chrome 加载。

`extractor.js` 约 85KB，包含打包后的 Readability.js、Turndown 和所有站点适配器。

---

## 已知陷阱

### Blob URL 过早释放导致下载截断 ⭐⭐⭐ 🌐chrome-ext
- **Key**: `trap:chrome-ext:blob-revoke-timing`
- **现象**: 大文件下载末尾缺失/截断，saveAs 对话框停留时下载失败
- **原因**: 固定超时强制 `URL.revokeObjectURL()`，未等待下载完成
- **避免**: 仅在 `downloads.onChanged` 的 complete/interrupted/error 状态后释放

### 固定延迟等待注入脚本不可靠 ⭐⭐⭐ 🌐chrome-ext
- **Key**: `trap:chrome-ext:script-inject-timing`
- **现象**: 复杂页面提取随机失败，返回 undefined 或空结果
- **原因**: 固定 `setTimeout` 无法保证 Readability+Turndown 处理完成
- **避免**: 改为轮询等待结果（每200ms检查，带超时）

### 懒加载图片只接受 http 开头 ⭐⭐ 🌐js
- **Key**: `trap:js:lazy-image-url-normalize`
- **现象**: 协议相对路径 `//` 或相对路径 `/img.jpg` 的图片丢失
- **原因**: `value.startsWith('http')` 过滤掉了合法的相对 URL
- **避免**: 使用 `new URL(value, location.href)` 归一化

### SPA 站点导航噪声 ⭐⭐⭐ 🌐chrome-ext
- **Key**: `trap:chrome-ext:spa-nav-noise`
- **现象**: 面包屑、侧边栏、页脚被 Readability 当作正文提取
- **原因**: SPA 动态渲染，DOM 结构复杂
- **避免**: 在 `lib/sites/adapters/` 中添加站点适配器的 `removeSelectors`

### 零宽字符污染 Markdown ⭐⭐ 🌐js
- **Key**: `trap:js:zero-width-chars`
- **现象**: 行尾有不可见字符，Markdown 格式异常
- **原因**: 国际化站点用零宽字符辅助断字
- **避免**: Turndown 后用 `removeZeroWidthChars()` 清理

---

## 架构决策

### 程序化注入 vs Content Script ⭐⭐⭐
- **Key**: `decision:inject:programmatic`
- **选择**: 程序化注入 (`chrome.scripting.executeScript`)
- **原因**: `activeTab` 权限无法声明式注册 content script
- **放弃**: manifest 声明式注入（需要 host_permissions）

### Blob 下载 vs Data URL ⭐⭐⭐
- **Key**: `decision:download:blob`
- **选择**: Blob + `URL.createObjectURL()`
- **原因**: 避免长文章被 URL 长度限制截断（data URL 有 2MB 限制）
- **放弃**: Data URL（长度限制）

### 会话级 ID 生成 ⭐⭐
- **Key**: `decision:id:session-level`
- **选择**: Popup 打开时生成一次 ID
- **原因**: 用户编辑标题时 ID 保持稳定，避免重复生成
- **放弃**: 每次标题变化都重新生成（ID 不稳定）

### Pipeline + Adapter 架构 ⭐⭐⭐
- **Key**: `decision:arch:pipeline-adapter`
- **选择**: 4 阶段管线（Preprocess → Extract → Convert → Format）+ 站点适配器
- **原因**: 2188 行 monolithic 文件拆分为 ~20 个模块，每个站点配置集中在一处
- **放弃**: 原始 if-else 链（同一站点配置散布 3 处，无法独立测试）

---

📁 知识归档: [docs/knowledge/](docs/knowledge/)
