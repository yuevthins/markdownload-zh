# Task Plan: 内容提取修复

## 元信息
- 🔄 **续跑点**: Task 1 (共 7)
- 📅 **创建时间**: 2026-01-25 11:00
- 🌿 **分支**: (非 Git 仓库)
- 💾 **状态包**: .claude/state.json
- 📄 **设计文档**: docs/plans/2026-01-25-extractor-fixes-design.md
- 📋 **详细计划**: docs/plans/2026-01-25-extractor-fixes-plan.md

## 上下文快照
修复用户测试反馈的内容提取问题：
- TikTok Shop 导航噪声
- 零宽空格残留
- 图片 alt 丢失

---

## Tasks

- [x] Task 1: 创建文本清理工具模块
- [x] Task 2: 创建文本清理工具测试
- [x] Task 3: 添加 TikTok Shop 站点预处理
- [x] Task 4: 添加零宽字符清理逻辑
- [x] Task 5: 改进图片 alt 提取逻辑
- [x] Task 6: 运行完整测试
- [x] Task 7: 构建并验证

---

## 进度记录

| Task | 状态 | 完成时间 | 备注 |
|------|------|----------|------|
| 1-2 | ✅ 完成 | 14:21 | text-cleanup 工具 + 14 个测试 |
| 3 | ✅ 完成 | 14:22 | TikTok Shop 预处理 |
| 4 | ✅ 完成 | 14:22 | 零宽字符清理 |
| 5 | ✅ 完成 | 14:22 | 智能 alt 提取 |
| 6-7 | ✅ 完成 | 14:22 | 59 测试通过，构建 65KB |

---

## 进度记录

| Task | 状态 | 完成时间 | 备注 |
|------|------|----------|------|
| 1-2 | ✅ 完成 | 18:12 | WXT + 依赖安装 |
| 3-7 | ✅ 完成 | 18:12 | 所有工具函数 + 23 个测试通过 |
| 8-12 | ✅ 完成 | 18:15 | Popup 内联提取逻辑，程序化注入 |
| 14-15 | ✅ 完成 | 18:16 | PNG 图标 + README |

## 架构调整说明

根据专家意见，实际实现与原计划有以下调整：

1. ~~**内容提取内联**：原计划使用独立 Content Script，实际使用 `chrome.scripting.executeScript({ func })` 内联函数方式~~
2. ~~**无外部依赖注入**：由于程序化注入限制，Readability.js 和 Turndown 改为在 Popup 中内联实现简化版本~~
3. **会话级 ID**：在 `init()` 时一次性生成，修改标题不会改变 ID

### v0.1.1 修复（2026-01-24 18:28）

用户测试反馈 MSN/Reddit 等网站内容提取失败（空内容或噪声过多）。

**根因**：简化版内联提取器无法处理复杂网站结构。

**修复**：
1. 使用 WXT unlisted script 功能（`extractor.unlisted.ts`）
2. 正确集成 Readability.js 和 Turndown 库（打包后 50KB）
3. 通过 `chrome.scripting.executeScript({ files: ['extractor.js'] })` 注入

### v0.1.2 修复（2026-01-24 18:31）

根据 Codex 代码审查意见进行修复。

**问题 1：data URL 长度限制导致内容截断**
- 原因：使用 `data:text/markdown;charset=utf-8,` 拼接下载，长文章超过 URL 长度限制
- 修复：改用 Blob + `URL.createObjectURL()` 下载，下载完成后自动释放

**问题 2：懒加载图片属性覆盖不足**
- 原因：只处理 `data-src`，忽略其他常见属性
- 修复：扩展支持 13 种懒加载属性（data-original, data-actualsrc, data-srcset 等）
- 新增：处理 `picture/source` 元素、`noscript` 中的真实图片

**问题 3：文件名未正确使用标题**
- 原因：标题提取可能失败导致使用默认名称
- 修复：添加 fallback 到 'untitled'

**测试**：23 个单元测试全部通过

## 下一步

用户在 Chrome 中加载 `markdownload-zh-extension/` 目录进行端到端测试。
