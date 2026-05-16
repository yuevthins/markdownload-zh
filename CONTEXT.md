# CONTEXT.md

## Domain language

| Term | Definition |
|------|-----------|
| **剪藏 (Clip)** | 从网页提取正文内容并转换为 Markdown 的完整动作 |
| **站点适配器 (Site Adapter)** | 针对特定站点的 DOM 预处理 + 可选的自定义提取逻辑 |
| **customExtract** | 适配器完全绕过通用提取引擎，自行处理内容提取（用于飞书虚拟滚动、Reddit Shadow DOM 等） |
| **预览模式 (Preview Mode)** | 点击图标 → 弹窗预览 Markdown → 手动下载/复制 |
| **Obsidian 模式 (Obsidian Mode)** | 点击图标 → 弹窗预览 → 通过 obsidian:// URI 保存到 vault |
| **快速模式 (Quick Mode)** | 点击图标 → 无弹窗，自动提取并保存到用户默认目标 |
| **Vault** | Obsidian 的笔记库，一个本地文件夹 |
| **Inbox** | Vault 内用于接收剪藏内容的目标文件夹（用户可配置） |
| **降级链 (Fallback Chain)** | 当首选保存方式失败时，自动切换到备选方式的机制 |
| **defuddle** | Obsidian 官方的内容提取引擎（替代 Readability.js + Turndown），负责从 DOM 提取正文并转为 Markdown |
| **Frontmatter** | Markdown 文件头部的 YAML 元数据块，包含 title/id/tags 等字段 |
| **Badge 反馈** | 快速模式下通过扩展图标上的短暂文字（✓/✗）告知用户操作结果 |

## Boundaries

- 本扩展是纯浏览器端工具，不与任何服务器通信
- 与 Obsidian 的交互仅通过 obsidian:// URI scheme，不直接访问文件系统
- 站点适配器只处理 DOM 层面的问题，不做网络请求
