# 0001: 引入 defuddle 替代 Readability.js + Turndown，新增 Obsidian 保存和快速模式

## Status

Accepted (2026-05-16)

## Context

扩展当前使用 Readability.js 提取正文 + Turndown 转 Markdown，对未适配站点的通用提取质量有限。用户希望：
1. 提升通用站点的提取质量
2. 直接保存到 Obsidian vault（而非仅下载到文件夹）
3. 一键快速剪藏（无需预览确认）

## Decision

### 提取引擎

引入 [defuddle](https://github.com/kepano/defuddle)（MIT，Obsidian Clipper 的底层引擎）替代 Readability.js + Turndown。

- defuddle 同时完成内容提取和 Markdown 转换
- 比 Readability 更宽容，内置 CSS 隐藏检测、footnote/math/code 标准化
- 现有站点适配器保留：简单适配器作为 preprocess 层，复杂适配器（飞书、Reddit）通过 customExtract 绕过 defuddle

### Obsidian 保存

通过 `obsidian://new` URI scheme 保存笔记到用户指定的 vault + 文件夹。
- 用户在 options page 手动配置 vault 名称和目标路径
- 内容超过 100KB 时自动降级到文件下载

### 交互模式

三种模式，用户在 options page 选择：
- 预览模式（当前行为）
- Obsidian 模式（预览后保存到 vault）
- 快速模式（无 popup，通过 `chrome.action.setPopup('')` 动态切换，background.ts 执行，badge 反馈）

### 实施分阶段

- Phase 1: 换引擎（defuddle 集成 + 适配器接口适配）
- Phase 2: 新功能（options page + Obsidian 模式 + 快速模式）

## Consequences

- 需要重构 Stage 2（extract）+ Stage 3（convert）为单一 defuddle 调用
- 新增 `defuddle` 依赖（替换 `@mozilla/readability` + `turndown`）
- 新增 options page 入口点（`entrypoints/options/`）
- background.ts 从极简变为承载快速模式逻辑
- 不需要新增 Chrome 权限（obsidian:// 通过 tab navigation 打开）
