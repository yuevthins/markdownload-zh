# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

MarkDownload 中文版：面向 Obsidian 用户的中文优化 Markdown 网页剪藏 Chrome 扩展。

**技术栈**：WXT 框架 + TypeScript + Chrome MV3 + Readability.js + Turndown

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
Popup 轮询读取结果 → 渲染预览
    ↓
用户点击下载 → Blob URL 下载
```

### 入口点

| 文件 | 角色 |
|------|------|
| `entrypoints/popup/` | Popup 界面，主交互入口 |
| `entrypoints/extractor.unlisted.ts` | 入口文件（~15行），调用 `lib/pipeline.ts` |
| `entrypoints/background.ts` | Service Worker（极简版） |

### 核心业务逻辑 (lib/)

Pipeline + Site Adapter 架构，4 阶段管线：
- `lib/pipeline.ts` — 主管线 orchestrator
- `lib/preprocess/` — Stage 1: DOM 预处理（懒加载、表格、视频）
- `lib/sites/` — 站点适配器注册表（11 个适配器文件覆盖 68 个站点）+ `helpers.ts` 工厂函数
- `lib/extract/` — Stage 2: Readability + 后备提取
- `lib/convert/` — Stage 3: Turndown HTML→Markdown
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

### Blob 下载

使用 Blob + `URL.createObjectURL()` 而非 data URL，避免长文章被 URL 长度限制（2MB）截断。Blob URL 在 `downloads.onChanged` 的 complete/interrupted/error 状态后释放。

### 会话级 ID

每次打开 Popup 时生成一次 ID（格式：YYYYMMDD-xxxx），用户编辑标题不会改变 ID。

## 中文站点适配

中文站点的预处理已迁移到 `lib/sites/adapters/`，每个适配器实现 `SiteAdapter` 接口（定义在 `lib/types.ts`）：

- `wechat.ts` — 微信公众号：修复 `data-src` 图片、移除二维码
- `zhihu.ts` — 知乎：移除推荐栏、热门问答
- `qq-news.ts` — 腾讯新闻：移除视频播放器 UI、AI 助手、广告
- `chinese-tech.ts` — 掘金/博客园/思否等中文技术站集合适配器

扩展新站点时，在 `lib/sites/adapters/` 新建适配器文件并注册到 `lib/sites/index.ts`。简单站点可用 `helpers.ts` 中的 `createSimpleAdapter()` 工厂函数。

## 已知陷阱

| 陷阱 | 现象 | 规避 |
|------|------|------|
| Blob URL 过早释放 | 大文件下载末尾缺失 | 仅在 `downloads.onChanged` 完成后释放 |
| 固定延迟等待注入脚本 | 复杂页面提取随机失败 | 改为轮询等待结果（每200ms，带超时） |
| 懒加载图片只接受 http 开头 | 相对路径图片丢失 | 使用 `new URL(value, location.href)` 归一化 |

## 测试

- **单元测试**：Vitest + jsdom，测试文件与源文件同目录（`*.test.ts`）
- **集成测试**：`tests/integration/`，测试完整提取管线
- **E2E 测试**：Playwright，测试真实浏览器中的扩展行为

## 构建产物

生产构建输出到 `markdownload-zh/.output/chrome-mv3/`，可直接在 Chrome 加载。`extractor.js` 包含打包后的 Readability.js 和 Turndown。

预构建版本在 `markdownload-zh-extension/` 目录，可直接用于端到端测试。

## 添加新站点适配器

1. 在 `lib/sites/adapters/` 创建适配器文件，实现 `SiteAdapter` 接口
2. 简单站点用 `createSimpleAdapter()`，复杂站点手写 4 阶段钩子
3. 在 `lib/sites/registry.ts` 注册站点 ID 与适配器的映射
4. 添加对应的单元测试和 fixture
