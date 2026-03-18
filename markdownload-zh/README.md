# MarkDownload 中文版

将网页内容剪藏为 Markdown 文件，专为 Obsidian 用户优化。

## 特性

- 🎯 一键提取网页正文
- 📝 实时 Markdown 预览
- 📋 复制到剪贴板
- 🇨🇳 中文优化（微信公众号、知乎等）
- 📋 符合 Obsidian Vault 规范的 Frontmatter
- 🔒 仅 activeTab 权限，无需全站权限

## 隐私声明

**本扩展完全本地处理，不收集任何用户数据，不发送网络请求。**

## 安装

### 开发版本

1. 克隆仓库
2. `npm install`
3. `npm run build`
4. 在 Chrome 加载 `.output/chrome-mv3/`

## 使用

1. 打开任意网页
2. 点击扩展图标
3. 预览/编辑标题
4. 点击下载或复制

## Frontmatter 格式

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

## 开发

```bash
npm run dev     # 开发模式
npm run build   # 构建
npm test        # 测试
npm run lint    # 代码检查
```

## 技术栈

- WXT 框架
- TypeScript
- Chrome Extension MV3
- activeTab + Scripting API

## 许可

MIT
