# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

MarkDownload 中文版：面向 Obsidian 用户的中文优化 Markdown 网页剪藏 Chrome 扩展。

**技术栈**：WXT 框架 + TypeScript + Chrome MV3 + defuddle (正文提取 + Markdown 转换)

**权限模型**：仅使用 `activeTab` + `scripting` + `downloads`，按需注入，无全站权限。

## 目录结构

```
.
├── markdownload-zh/           # 源代码（WXT 项目）
├── markdownload-zh-extension/ # 构建产物（可直接加载到 Chrome）
├── docs/                      # 文档
│   └── plans/                 # 设计文档和计划
└── task_plan.md               # 项目任务追踪
```

## 常用命令

在 `markdownload-zh/` 目录下执行：

```bash
npm run dev      # 开发模式（热重载）
npm run build    # 生产构建，输出到 .output/chrome-mv3/
npm test         # 运行所有单元测试（Vitest）
npm test -- utils/filename.test.ts  # 运行单个测试文件
npm run test:integration   # 集成测试（tests/integration/）
npm run test:e2e           # E2E 测试（Playwright，无头）
npm run test:e2e:headed    # E2E 测试（有头浏览器）
npm run test:extraction    # 提取流程专项测试
npm run lint     # ESLint 检查（需 ESLINT_USE_FLAT_CONFIG=false）
npm run format   # Prettier 格式化
```

构建后同步产物到 extension 目录：
```bash
cp .output/chrome-mv3/extractor.js ../markdownload-zh-extension/extractor.js
cp .output/chrome-mv3/chunks/*.js ../markdownload-zh-extension/chunks/
cp .output/chrome-mv3/popup.html ../markdownload-zh-extension/popup.html
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
    ├── 普通站点: defuddle 提取正文 + 转 Markdown
    ├── 复杂站点: customExtract（如飞书虚拟滚动）
    └── 结果存入 window.__markdownload_extracted
    ↓
Popup 轮询读取结果（每 200ms，最多 30 秒）→ 渲染预览
    ↓
用户点击下载 → Content Script 注入下载 → chrome.downloads 降级 → <a download> 兜底
```

### 入口点

| 文件 | 角色 |
|------|------|
| `entrypoints/popup/` | Popup 界面，主交互入口（30 秒轮询超时） |
| `entrypoints/extractor.unlisted.ts` | 入口文件（~15行），调用 `lib/pipeline.ts`，传入 `sourceDoc` 供 Shadow DOM / 虚拟滚动站点使用 |
| `entrypoints/background.ts` | Service Worker（极简版） |

### 核心业务逻辑 (lib/)

Pipeline + Site Adapter 架构，4 阶段管线：
- `lib/pipeline.ts` — 主管线 orchestrator
- `lib/preprocess/` — Stage 1: DOM 预处理（懒加载、表格、视频）
- `lib/sites/` — 站点适配器注册表（13 个适配器文件覆盖 68 个站点）+ `helpers.ts` 工厂函数
- `lib/extract/` — Stage 2: defuddle 提取 + 后备提取（支持 `customExtract` + `needsSourceDoc`）
- `lib/convert/` — (已移除，defuddle 内置 Markdown 转换)
- `lib/format/` — Stage 4: 后处理清理

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

由于 `activeTab` 权限无法声明式注册 content script，采用 WXT unlisted script + `chrome.scripting.executeScript({ files: [...] })` 按需注入。结果通过 `window.__markdownload_extracted` 全局变量传递。

### Blob 下载（三级降级链）

1. **Content Script 注入**：在目标页面创建 Blob URL（origin 为网页域名，绕过 Chrono 拦截）
2. **chrome.downloads**：扩展 API 下载（可能被 Chrono 改名）
3. **\<a download\>**：兜底方案

Blob URL 在 `downloads.onChanged` 的 complete/interrupted/error 状态后释放。

### 会话级 ID

每次打开 Popup 时生成一次 ID（格式：YYYYMMDD-xxxx），用户编辑标题不会改变 ID。

### needsSourceDoc 模式

复杂站点（如飞书）的 `customExtract` 需要访问**活文档**（非克隆），用于虚拟滚动、Shadow DOM 读取等场景。设置 `needsSourceDoc: true` 后，pipeline 传入原始 `document` 作为第三参数。

## 站点适配器

13 个适配器文件，覆盖 68 个站点。在 `lib/sites/adapters/` 下：

| 适配器 | 类型 | 说明 |
|--------|------|------|
| `feishu.ts` | 复杂（customExtract） | 飞书文档：虚拟滚动 + 表格逐行合并 + Canvas 图片转 data URL |
| `twitter.ts` | 复杂（customExtract） | X/Twitter：区分 Article 长文与 Tweet，站内链接转纯文本，翻译检测 |
| `wechat.ts` | 复杂 | 微信公众号：修复 `data-src` 图片、移除二维码 |
| `zhihu.ts` | 复杂 | 知乎：移除推荐栏、热门问答 |
| `reddit.ts` | 复杂（needsSourceDoc） | Reddit：Shadow DOM 读取 |
| `qq-news.ts` | 复杂 | 腾讯新闻：移除视频播放器 UI、AI 助手 |
| `csdn.ts` | 中等 | CSDN：登录墙处理 |
| `tiktok-shop.ts` | 中等 | TikTok Shop：多语言表格 |
| `chinese-tech.ts` | 集合（12 站） | 掘金/博客园/思否/语雀等 |
| `news.ts` | 集合 | 新闻站点 |
| `tech-blogs.ts` | 集合 | 技术博客 |
| `generic-docs.ts` | 检测型 | GitBook/Docusaurus 等文档框架 |
| `_simple.ts` | 简单 | 其余站点 |

### 添加新站点适配器

1. 在 `lib/sites/adapters/` 创建适配器文件，实现 `SiteAdapter` 接口
2. 简单站点用 `createSimpleAdapter()`，复杂站点手写 `customExtract`
3. 需要活文档访问时设置 `needsSourceDoc: true`
4. 在 `lib/sites/index.ts` 注册（复杂站点放前面，优先匹配）
5. 添加对应的单元测试和 fixture

### 飞书适配器（最复杂的适配器）

覆盖：docx ✓ / file ✓（重定向到 docx）/ sheets △ / slides ✗ / base ✗（Canvas 渲染）

核心机制：
- **虚拟滚动**：自适应滚动收集 `div[data-block-id]`，连续 5 步无新内容 = 到底，硬性上限 25 秒
- **表格**：按 `<tr data-index>` 逐行收集，跨滚动位置合并（scrollHeight 动态增长）
- **图片**：80% blob: URL → Canvas 转 `data:image/jpeg`（JPEG 0.6 + 限宽 800px），100% 成功率
- **标题**：从 `page` block 提取，自动清理零宽字符
- **防护**：每步检测 `isDocxPage()`，防止知识库 SPA 跳转

## 已知陷阱

| 陷阱 | 现象 | 规避 |
|------|------|------|
| Blob URL 过早释放 | 大文件下载末尾缺失 | 仅在 `downloads.onChanged` 完成后释放 |
| 固定延迟等待注入脚本 | 复杂页面提取随机失败 | 改为轮询等待结果（每 200ms，带超时） |
| 懒加载图片只接受 http 开头 | 相对路径图片丢失 | 使用 `new URL(value, location.href)` 归一化 |
| 飞书表格只采集一次 | 表格只有初始可见行 | 按 `data-index` 逐行收集，跨滚动位置合并 |
| 飞书 scrollHeight 动态增长 | 滚动提前结束 | 每步更新循环上界 |
| 飞书图片 blob: URL | Obsidian/Typora 无法显示 | Canvas 转 data:image/jpeg 内嵌 |
| 飞书零宽字符污染标题 | 标题含不可见字符 | `cleanZeroWidth()` 清理 |

## 测试

- **单元测试**：Vitest + jsdom，测试文件与源文件同目录（`*.test.ts`）
- **集成测试**：`tests/integration/`，测试完整提取管线
- **E2E 测试**：Playwright，测试真实浏览器中的扩展行为

## 构建产物

生产构建输出到 `markdownload-zh/.output/chrome-mv3/`，可直接在 Chrome 加载。`extractor.js`（~740KB）包含打包后的 defuddle（含 Markdown 转换器）和所有站点适配器。

预构建版本在 `markdownload-zh-extension/` 目录，构建后需手动同步（见常用命令）。
