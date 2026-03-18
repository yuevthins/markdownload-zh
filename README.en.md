<div align="center">

# MarkDownload Chinese Edition

**One-click web clipping to Markdown, built for Obsidian users**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WXT](https://img.shields.io/badge/Built_with-WXT-FF6C37)](https://wxt.dev/)

English | [简体中文](README.md)

<img src="docs/screenshot-popup.png" width="480" alt="MarkDownload popup interface">

</div>

## Tutorial

<div align="center">

<img src="docs/tutorial.gif" width="720" alt="MarkDownload Tutorial">

*Open page → Click icon → Preview Markdown → Download*

</div>

---

## Why MarkDownload Chinese Edition?

| | Other Clippers | MarkDownload |
|:---:|:---:|:---:|
| **Permissions** | All sites / broad host access | `activeTab` only — access on click |
| **Chinese Sites** | Broken images, ads, encoding issues | 62 sites deeply adapted |
| **Obsidian** | Manual frontmatter | Auto-generated frontmatter |
| **Privacy** | May upload data | Fully local, zero network requests |

## Features

- **One-Click Clip** — Click the icon to extract, convert, and download as Markdown
- **62 Site Adapters** — WeChat, Zhihu, CSDN, Juejin, QQ News, Reddit, and more
- **Obsidian Frontmatter** — Auto-generates `title` / `id` / `created` / `tags` / `source`
- **Smart Image Handling** — 13 lazy-load attributes detected, relative URLs auto-resolved
- **Live Preview** — Preview full Markdown before downloading, edit title inline
- **Privacy First** — Only `activeTab` + `scripting` + `downloads` permissions

## Quick Start

### Install (Dev Build)

```bash
git clone https://github.com/yuevthins/markdownload-zh.git
cd markdownload-zh/markdownload-zh
npm install
npm run build
```

Then in Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3/` directory

### Usage

1. Open any web page
2. Click the extension icon
3. Preview Markdown / edit title
4. Click **Download** or **Copy**

## Output Format

Generated Markdown files include Obsidian-compatible frontmatter:

```yaml
---
title: "Article Title"
id: 20260318-k7f2
created: 2026-03-18
updated: 2026-03-18
captured: 2026-03-18 21:30:00
status: draft
category: resource
tags:
  - saved
source: https://example.com/article
site: example.com
---
```

## Supported Sites (62)

### Chinese Content Platforms

| Site | Domain | Adapter Features |
|:-----|:-------|:-----------------|
| WeChat Official Accounts | `mp.weixin.qq.com` | Fix `data-src` lazy images, remove QR codes |
| Zhihu | `zhihu.com` | Remove recommendations, login prompts |
| CSDN | `csdn.net` | Remove login overlay, ads |
| Juejin | `juejin.cn` | Clean sidebar and recommendations |
| cnblogs | `cnblogs.com` | Clean navigation and ads |
| Jianshu | `jianshu.com` | Remove follow prompts |
| SegmentFault | `segmentfault.com` | Clean sidebar |
| sspai | `sspai.com` | Clean membership prompts |
| Yuque | `yuque.com` | Handle Yuque doc structure |
| OSChina | `oschina.net` | Clean recommendations |
| 51CTO | `51cto.com` | Clean ads |
| V2EX | `v2ex.com` | Clean node navigation |
| Feishu Docs | `feishu.cn` | Handle Feishu structure |

### Chinese News

| Site | Domain |
|:-----|:-------|
| QQ News | `news.qq.com` |
| The Paper | `thepaper.cn` |
| iFeng | `ifeng.com` |
| NetEase | `163.com` |
| Sina / Weibo | `sina.com.cn` / `weibo.com` |
| Sohu | `sohu.com` |
| 36Kr | `36kr.com` |
| Huxiu | `huxiu.com` |
| TMTPost | `tmtpost.com` |
| iFanr | `ifanr.com` |
| Toutiao | `toutiao.com` |
| Baijiahao | `baijiahao.baidu.com` |
| Douban | `douban.com` |
| MSN | `msn.cn` / `msn.com` |

### International News & Tech

BBC, CNN, The Verge, TechCrunch, Ars Technica, Wired, The Guardian, New York Times, Washington Post, Reuters, Bloomberg, Forbes

### Tech Blogs & Communities

Medium, DEV Community, Hacker News, Stack Overflow, GitHub, GitLab, Hashnode, freeCodeCamp, CSS-Tricks, Smashing Magazine, DigitalOcean, LogRocket Blog, InfoQ CN, LeetCode CN

### Cloud Developer Communities

Alibaba Cloud Developer (`developer.aliyun.com`), Tencent Cloud Developer (`cloud.tencent.com/developer`)

### Doc Frameworks (Auto-detected)

GitBook, Docusaurus, VuePress/VitePress, MkDocs, Read the Docs

### Other Popular Sites

Wikipedia, MDN Web Docs, W3Schools, Quora, Substack, Notion, Reddit (Shadow DOM support), TikTok Shop

> **Site not listed?** The extension still works as a general-purpose clipper. [Open an issue](https://github.com/yuevthins/markdownload-zh/issues) to request a new adapter.

## Architecture

```
4-Stage Pipeline Architecture (Pipeline + Site Adapter)

User clicks icon → Popup
       ↓
chrome.scripting.executeScript
       ↓
┌──────────────────────────────────────┐
│  Stage 1: Preprocess                 │
│  Lazy images · Table normalization   │
├──────────────────────────────────────┤
│  Stage 2: Extract                    │
│  Readability.js + fallback extractor │
├──────────────────────────────────────┤
│  Stage 3: Convert                    │
│  Turndown HTML→Markdown + GFM        │
├──────────────────────────────────────┤
│  Stage 4: Format                     │
│  Zero-width char cleanup · Newlines  │
└──────────────────────────────────────┘
       ↓
Popup renders preview → Download / Copy
```

## Development

```bash
cd markdownload-zh

npm run dev              # Dev mode (hot reload)
npm test                 # Unit tests (Vitest)
npm run test:integration # Integration tests
npm run test:e2e         # E2E tests (Playwright)
npm run lint             # ESLint
npm run build            # Production build
```

### Adding a New Site Adapter

1. Create an adapter file in `lib/sites/adapters/`
2. Implement the `SiteAdapter` interface (or use `createSimpleAdapter()`)
3. Register it in `lib/sites/index.ts`
4. Add test fixtures

## Tech Stack

| Technology | Purpose |
|:-----------|:--------|
| [WXT](https://wxt.dev/) | Browser extension framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Readability.js](https://github.com/mozilla/readability) | Content extraction (Mozilla) |
| [Turndown](https://github.com/mixmark-io/turndown) | HTML → Markdown conversion |
| [Vitest](https://vitest.dev/) | Unit testing |
| [Playwright](https://playwright.dev/) | E2E testing |

## Contributing

PRs welcome!

<details>
<summary><b>Contributing Guide</b></summary>

1. **Fork the repo**
2. **Clone locally**
   ```bash
   git clone https://github.com/<your-username>/markdownload-zh.git
   ```
3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature
   ```
4. **Develop and test**
   ```bash
   cd markdownload-zh
   npm install && npm test
   ```
5. **Commit**
   ```bash
   git commit -m "feat: add XX site adapter"
   ```
6. **Push and create a PR**
   ```bash
   git push origin feature/your-feature
   ```

</details>

<a href="https://github.com/yuevthins/markdownload-zh/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=yuevthins/markdownload-zh" />
</a>

## License

[MIT](LICENSE)

## Acknowledgments

- [Readability.js](https://github.com/mozilla/readability) — Mozilla's content extraction engine
- [Turndown](https://github.com/mixmark-io/turndown) — HTML to Markdown converter
- [WXT](https://wxt.dev/) — Browser extension development framework
- [MarkDownload](https://github.com/deathau/markdownload) — Original inspiration

---

<div align="center">

**If you find this useful, please give it a Star ⭐**

</div>
