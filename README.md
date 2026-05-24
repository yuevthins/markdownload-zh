<div align="center">

# MarkDownload 中文版

**将网页一键剪藏为 Markdown，专为 Obsidian 用户打造**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WXT](https://img.shields.io/badge/Built_with-WXT-FF6C37)](https://wxt.dev/)

[English](README.en.md) | 简体中文

<img src="docs/screenshot-popup.png" width="480" alt="MarkDownload 弹窗界面">

</div>

## 使用教程

<div align="center">

<img src="docs/tutorial.gif" width="720" alt="MarkDownload 使用教程">

*打开网页 → 点击图标 → 预览 Markdown → 一键下载*

</div>

---

## 为什么选择 MarkDownload 中文版？

| | 其他剪藏工具 | MarkDownload 中文版 |
|:---:|:---:|:---:|
| **权限** | 全站权限 / 读取所有网站 | 仅 `activeTab` — 点击时才访问当前页 |
| **中文站点** | 图片丢失、乱码、广告残留 | 62 个站点深度适配 |
| **Obsidian** | 需要手动加 Frontmatter | 自动生成完整 Frontmatter |
| **隐私** | 可能上传数据 | 完全本地处理，零网络请求 |

## 核心特性

- **三种模式** — 预览模式（默认）/ Obsidian 模式 / 快速模式，在设置页自由切换
- **一键剪藏** — 点击图标，自动提取正文、生成 Markdown、下载到本地
- **快速模式** — 无弹窗，点击图标后台直接保存，✓ 绿色 badge 表示成功
- **Obsidian 集成** — 配置 Vault 后通过 `obsidian://` 协议直接保存到笔记库
- **62 个站点适配** — 微信公众号 / 知乎 / CSDN / 掘金 / 腾讯新闻 / Reddit 等
- **Obsidian Frontmatter** — 自动生成 `title` / `id` / `created` / `tags` / `source` 元数据
- **智能图片处理** — 13 种懒加载属性自动识别，相对路径自动转绝对路径
- **实时预览** — 下载前预览完整 Markdown 内容，支持编辑标题
- **隐私优先** — 仅 `activeTab` + `scripting` + `downloads` + `storage` 四项权限

## 快速开始

### 方式一：直接安装（推荐，无需编程）

1. [下载最新 Release](https://github.com/yuevthins/markdownload-zh/releases) 中的 `markdownload-zh-extension.zip`
2. 解压到任意文件夹
3. 打开 Chrome，地址栏输入 `chrome://extensions/`
4. 打开右上角 **「开发者模式」** 开关
5. 点击左上角 **「加载已解压的扩展程序」**
6. 选择刚才解压的文件夹

> 安装成功后，Chrome 工具栏会出现 MarkDownload 图标。建议点击拼图图标 📌 将其固定。

### 方式二：从源码构建

需要 [Node.js](https://nodejs.org/) 18+ 环境：

```bash
git clone https://github.com/yuevthins/markdownload-zh.git
cd markdownload-zh/markdownload-zh
npm install
npm run build
```

构建完成后，按方式一的步骤 3-6 操作，选择 `.output/chrome-mv3/` 目录。

### 使用方法

| 步骤 | 操作 | 说明 |
|:----:|:-----|:-----|
| 1 | 打开任意网页 | 支持绝大多数网站，`chrome://` 等系统页面除外 |
| 2 | 点击工具栏的 MarkDownload 图标 | 扩展会自动提取正文内容 |
| 3 | 预览 Markdown | 可在标题栏直接编辑文件名 |
| 4 | 点击 **⬇ 下载** 或 **📋 复制** | 下载为 `.md` 文件到默认下载目录；或复制到剪贴板后粘贴到 Obsidian |

**常见问题：**

- **图片没显示？** 部分站点使用懒加载，请先滚动页面让图片加载完再剪藏
- **内容不完整？** 对于需要展开的长文，先点击「展开全文」再使用扩展
- **下载到哪了？** 默认保存到 Chrome 的下载目录，文件名为文章标题

## 输出格式

生成的 Markdown 文件自动包含 Obsidian 兼容的 Frontmatter：

```yaml
---
title: "深度学习在自然语言处理中的最新进展"
id: 20260318-k7f2
created: 2026-03-18
updated: 2026-03-18
captured: 2026-03-18 21:30:00
status: draft
category: resource
tags:
  - 收藏
source: https://example.com/article
site: example.com
---
```

## 适配站点（62 个）

### 中文内容平台

| 站点 | 域名 | 适配能力 |
|:-----|:-----|:---------|
| 微信公众号 | `mp.weixin.qq.com` | 修复 `data-src` 懒加载图片、移除二维码和推广 |
| 知乎 | `zhihu.com` | 移除推荐栏、热门问答、登录弹窗 |
| CSDN | `csdn.net` | 移除登录遮罩、推荐文章、广告 |
| 掘金 | `juejin.cn` | 清理推荐和侧边栏 |
| 博客园 | `cnblogs.com` | 清理博客园导航和广告 |
| 简书 | `jianshu.com` | 移除关注提示和推荐 |
| 思否 | `segmentfault.com` | 清理侧边栏和广告 |
| 少数派 | `sspai.com` | 清理会员和推荐内容 |
| 语雀 | `yuque.com` | 处理语雀特有的文档结构 |
| 开源中国 | `oschina.net` | 清理社区推荐 |
| 51CTO | `51cto.com` | 清理广告和侧边栏 |
| V2EX | `v2ex.com` | 清理节点导航 |
| 飞书文档 | `feishu.cn` | 处理飞书文档结构 |

### 中文新闻媒体

| 站点 | 域名 | 适配能力 |
|:-----|:-----|:---------|
| 腾讯新闻 | `news.qq.com` | 移除视频播放器 UI、AI 助手、广告 |
| 澎湃新闻 | `thepaper.cn` | 清理互动区和推荐 |
| 凤凰网 | `ifeng.com` | 清理广告和推荐流 |
| 网易 | `163.com` | 清理网易新闻推荐和广告 |
| 新浪/微博 | `sina.com.cn` / `weibo.com` | 清理微博卡片和推荐 |
| 搜狐 | `sohu.com` | 清理推荐和广告 |
| 36氪 | `36kr.com` | 清理会员和推荐 |
| 虎嗅 | `huxiu.com` | 清理推荐文章 |
| 钛媒体 | `tmtpost.com` | 清理广告 |
| 爱范儿 | `ifanr.com` | 清理推荐 |
| 今日头条 | `toutiao.com` | 清理推荐流 |
| 百度百家号 | `baijiahao.baidu.com` | 清理百度广告 |
| 豆瓣 | `douban.com` | 清理推荐和广告 |
| MSN | `msn.cn` / `msn.com` | 清理广告和推荐 |

### 国际新闻与科技

| 站点 | 域名 |
|:-----|:-----|
| BBC | `bbc.com` / `bbc.co.uk` |
| CNN | `cnn.com` |
| The Verge | `theverge.com` |
| TechCrunch | `techcrunch.com` |
| Ars Technica | `arstechnica.com` |
| Wired | `wired.com` |
| The Guardian | `theguardian.com` |
| New York Times | `nytimes.com` |
| Washington Post | `washingtonpost.com` |
| Reuters | `reuters.com` |
| Bloomberg | `bloomberg.com` |
| Forbes | `forbes.com` |

### 技术博客与社区

| 站点 | 域名 |
|:-----|:-----|
| Medium | `medium.com` |
| DEV Community | `dev.to` |
| Hacker News | `news.ycombinator.com` |
| Stack Overflow | `stackoverflow.com` |
| GitHub | `github.com` |
| GitLab | `gitlab.com` |
| Hashnode | `hashnode.dev` |
| freeCodeCamp | `freecodecamp.org` |
| CSS-Tricks | `css-tricks.com` |
| Smashing Magazine | `smashingmagazine.com` |
| DigitalOcean | `digitalocean.com/community` |
| LogRocket Blog | `blog.logrocket.com` |
| InfoQ 中文 | `infoq.cn` |
| LeetCode 中文 | `leetcode.cn` |

### 云厂商开发者社区

| 站点 | 域名 |
|:-----|:-----|
| 阿里云开发者 | `developer.aliyun.com` |
| 腾讯云开发者 | `cloud.tencent.com/developer` |

### 文档框架（自动检测）

| 框架 | 检测方式 |
|:-----|:---------|
| GitBook | URL (`gitbook.io`) + DOM 特征 |
| Docusaurus | DOM 特征检测 |
| VuePress / VitePress | DOM 特征检测 |
| MkDocs | DOM 特征检测 |
| Read the Docs | URL (`readthedocs.io`) |

### 其他常用站点

| 站点 | 域名 |
|:-----|:-----|
| Wikipedia | `wikipedia.org` |
| MDN Web Docs | `developer.mozilla.org` |
| W3Schools | `w3schools.com` |
| Quora | `quora.com` |
| Substack | `substack.com` |
| Notion | `notion.site` / `notion.so` |
| Reddit | `reddit.com`（支持 Shadow DOM） |
| X / Twitter | `x.com` / `twitter.com`（区分 Article 长文与 Tweet，智能清理排版） |
| TikTok Shop | `seller.tiktokshopglobalselling.com` |

> **未适配的站点？** 扩展仍可通用提取，只是没有针对性优化。欢迎 [提 Issue](https://github.com/yuevthins/markdownload-zh/issues) 请求适配新站点。

## 架构

```
4 阶段管线架构（Pipeline + Site Adapter）

用户点击图标 → Popup
       ↓
chrome.scripting.executeScript
       ↓
┌──────────────────────────────────────┐
│  Stage 1: Preprocess                 │
│  懒加载图片 · 表格归一化 · 噪声移除    │
├──────────────────────────────────────┤
│  Stage 2: Extract                    │
│  Readability.js + 后备提取器          │
├──────────────────────────────────────┤
│  Stage 3: Convert                    │
│  Turndown HTML→Markdown + GFM        │
├──────────────────────────────────────┤
│  Stage 4: Format                     │
│  零宽字符清理 · 空行压缩              │
└──────────────────────────────────────┘
       ↓
Popup 渲染预览 → 下载 / 复制
```

## 开发

```bash
cd markdownload-zh

npm run dev              # 开发模式（热重载）
npm test                 # 单元测试（Vitest）
npm run test:integration # 集成测试
npm run test:e2e         # E2E 测试（Playwright）
npm run lint             # ESLint
npm run build            # 生产构建
```

### 添加新站点适配器

1. 在 `lib/sites/adapters/` 创建适配器文件
2. 实现 `SiteAdapter` 接口（或用 `createSimpleAdapter()` 工厂函数）
3. 在 `lib/sites/index.ts` 注册
4. 添加测试 fixture

## 技术栈

| 技术 | 用途 |
|:-----|:-----|
| [WXT](https://wxt.dev/) | 浏览器扩展框架 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全 |
| [Readability.js](https://github.com/mozilla/readability) | 正文提取（Mozilla） |
| [Turndown](https://github.com/mixmark-io/turndown) | HTML → Markdown |
| [Vitest](https://vitest.dev/) | 单元测试 |
| [Playwright](https://playwright.dev/) | E2E 测试 |

## 参与贡献

欢迎提交 PR！

<details>
<summary><b>贡献指南</b></summary>

1. **Fork 仓库**
2. **克隆到本地**
   ```bash
   git clone https://github.com/<your-username>/markdownload-zh.git
   ```
3. **创建分支**
   ```bash
   git checkout -b feature/your-feature
   ```
4. **开发并测试**
   ```bash
   cd markdownload-zh
   npm install && npm test
   ```
5. **提交**
   ```bash
   git commit -m "feat: 添加 XX 站点适配器"
   ```
6. **推送并创建 PR**
   ```bash
   git push origin feature/your-feature
   ```

</details>

<a href="https://github.com/yuevthins/markdownload-zh/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=yuevthins/markdownload-zh" />
</a>

## 许可

[MIT](LICENSE)

## 致谢

- [Readability.js](https://github.com/mozilla/readability) — Mozilla 正文提取引擎
- [Turndown](https://github.com/mixmark-io/turndown) — HTML 转 Markdown
- [WXT](https://wxt.dev/) — 浏览器扩展开发框架
- [MarkDownload](https://github.com/deathau/markdownload) — 原版灵感来源

---

<div align="center">

**如果觉得好用，欢迎给个 Star ⭐**

</div>
