# MarkDownload 中文版 实现计划 v2

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个面向 Obsidian 用户的中文优化 Markdown 网页剪藏 Chrome 扩展

**Architecture:** 使用 WXT 框架开发 Chrome MV3 扩展。采用 **activeTab + 程序化注入** 模式：用户点击图标 → Popup 触发注入 → Content Script 提取 DOM **并转换 Markdown**（Readability 需要 DOM 环境）→ Popup 预览/下载。

**Tech Stack:** WXT, TypeScript, @mozilla/readability, turndown, turndown-plugin-gfm, Chrome Extension API (MV3)

---

## ⚠️ 关键架构决策（基于专家意见修订）

### 1. 注入策略：程序化注入（非静态声明）

```
❌ 错误：defineContentScript({ matches: ['<all_urls>'] })  // 静态声明
✅ 正确：chrome.scripting.executeScript()                  // 程序化注入
```

**原因**：
- 静态声明需要 host_permissions，用户安装时会看到权限警告
- activeTab 权限只在用户点击时临时授权，无警告
- 程序化注入更符合"按需授权"的安全模型

### 2. Markdown 转换位置：Content Script（非 Service Worker）

```
❌ 错误：Content Script 发送 HTML → Service Worker 转换
✅ 正确：Content Script 直接转换 → 发送 Markdown 字符串
```

**原因**：
- Readability.js 必须在 DOM 环境运行
- Service Worker 无 DOM 访问权限
- 发送 Markdown 字符串比 HTML 小很多，减少消息通道压力

### 3. 下载位置：Popup 直接下载（非通过 Service Worker）

```
❌ 风险：Popup → 发消息 → Service Worker 下载（SW 可能被卸载）
✅ 安全：Popup 直接调用 chrome.downloads.download()
```

**原因**：
- Popup 打开时一定存活，不存在生命周期问题
- 减少消息传递，逻辑更简单

### 4. ID 稳定性：会话级生成一次

```
❌ 错误：每次 updatePreview() 都 generateId()
✅ 正确：init() 成功后生成一次 sessionId，复用
```

**原因**：
- 同一篇剪藏应该稳定一个 ID
- 用户改标题不应导致 ID 变化

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `wxt.config.ts`
- Create: `tsconfig.json`

**Step 1: 初始化 WXT 项目**

Run:
```bash
cd "/Volumes/BigCongCong/SynologyDrive/于文聪的Claude code文件夹/16Markdown 下载插件"
npx wxt@latest init markdownload-zh --template vanilla
```

Expected: 创建 `markdownload-zh` 目录

**Step 2: 进入项目目录并安装依赖**

Run:
```bash
cd markdownload-zh && npm install
```

**Step 3: 安装核心依赖**

Run:
```bash
npm install @mozilla/readability turndown turndown-plugin-gfm
npm install -D @types/turndown vitest jsdom @types/jsdom
```

**Step 4: 配置 ESLint + Prettier**

Run:
```bash
npm install -D eslint prettier eslint-config-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

创建 `.eslintrc.json`:
```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "off"
  }
}
```

创建 `.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**Step 5: 更新 package.json scripts**

```json
{
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "test": "vitest",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write ."
  }
}
```

**Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: init WXT project with dev tooling"
```

---

## Task 2: 配置 WXT 和 Manifest

**Files:**
- Modify: `wxt.config.ts`
- Create: `vitest.config.ts`

**Step 1: 更新 WXT 配置（无 Solid 模块，无静态 content_scripts）**

修改 `wxt.config.ts`:

```typescript
import { defineConfig } from 'wxt';
import { resolve } from 'path';

export default defineConfig({
  alias: {
    '@': resolve(__dirname, './'),
  },
  manifest: {
    name: 'MarkDownload 中文版',
    description: '将网页内容剪藏为 Markdown 文件，专为 Obsidian 用户优化',
    version: '0.1.0',
    permissions: ['activeTab', 'scripting', 'downloads'],
    action: {
      default_title: 'MarkDownload',
      default_popup: 'popup.html',
    },
    icons: {
      16: 'icon/icon-16.png',
      48: 'icon/icon-48.png',
      128: 'icon/icon-128.png',
    },
  },
});
```

**注意**：不声明 `content_scripts`，使用程序化注入。

**Step 2: 创建 vitest 配置**

创建 `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
```

**Step 3: 创建类型定义文件**

创建 `types/index.ts`:

```typescript
/**
 * 提取的内容结构
 */
export interface ExtractedContent {
  title: string;
  content: string;  // HTML 格式
  excerpt: string;
  byline: string;
  siteName: string;
}

/**
 * 模板数据
 */
export interface TemplateData {
  title: string;
  url: string;
  date: string;
  id: string;
  content: string;  // Markdown 格式
  siteName?: string;
  capturedAt?: string;  // 含时分秒
}

/**
 * 提取结果消息
 */
export interface ExtractionResult {
  success: boolean;
  data?: {
    title: string;
    markdown: string;
    url: string;
    siteName?: string;
  };
  error?: {
    code: 'PAGE_NOT_ACCESSIBLE' | 'EXTRACTION_FAILED' | 'TIMEOUT';
    message: string;
  };
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "chore: configure WXT manifest and TypeScript types"
```

---

## Task 3: 工具函数 - ID 生成和日期格式化

**Files:**
- Create: `utils/id.ts`
- Create: `utils/id.test.ts`

**Step 1: 编写测试（使用本地时区安全的方式）**

创建 `utils/id.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateId, formatDate, formatDateTime } from './id';

describe('generateId', () => {
  it('should generate ID in YYYYMMDD-xxxx format', () => {
    const id = generateId();
    expect(id).toMatch(/^\d{8}-[a-z0-9]{4}$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('formatDate', () => {
  it('should format current date as YYYY-MM-DD', () => {
    const result = formatDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatDateTime', () => {
  it('should format current datetime with time', () => {
    const result = formatDateTime();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
```

**Step 2: 运行测试确认失败**

Run: `npm test -- --run`

Expected: FAIL

**Step 3: 实现函数**

创建 `utils/id.ts`:

```typescript
/**
 * 生成唯一 ID，格式：YYYYMMDD-xxxx
 */
export function generateId(): string {
  const now = new Date();
  const datePart = formatDateCompact(now);
  const randomPart = Math.random().toString(36).substring(2, 6);
  return `${datePart}-${randomPart}`;
}

function formatDateCompact(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 格式化日期为 YYYY-MM-DD（本地时区）
 */
export function formatDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss（用于 capturedAt）
 */
export function formatDateTime(date: Date = new Date()): string {
  const datePart = formatDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}:${seconds}`;
}
```

**Step 4: 运行测试确认通过**

Run: `npm test -- --run`

Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add ID generator and date formatters"
```

---

## Task 4: 工具函数 - 文件名处理

**Files:**
- Create: `utils/filename.ts`
- Create: `utils/filename.test.ts`

**Step 1: 编写测试（含 Windows 保留字检查）**

创建 `utils/filename.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from './filename';

describe('sanitizeFilename', () => {
  it('should remove forbidden characters', () => {
    expect(sanitizeFilename('test/file:name?.md')).toBe('test-file-name-.md');
  });

  it('should keep Chinese characters', () => {
    expect(sanitizeFilename('中文标题测试')).toBe('中文标题测试');
  });

  it('should truncate to 50 characters', () => {
    const longName = '这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常长的标题';
    expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(50);
  });

  it('should trim whitespace', () => {
    expect(sanitizeFilename('  test title  ')).toBe('test title');
  });

  it('should handle empty string', () => {
    expect(sanitizeFilename('')).toBe('untitled');
  });

  it('should handle Windows reserved names', () => {
    expect(sanitizeFilename('CON')).toBe('_CON');
    expect(sanitizeFilename('NUL')).toBe('_NUL');
    expect(sanitizeFilename('COM1')).toBe('_COM1');
  });

  it('should prevent path traversal', () => {
    expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..');
    expect(sanitizeFilename('//test')).not.toMatch(/^\/\//);
  });
});
```

**Step 2: 实现函数**

创建 `utils/filename.ts`:

```typescript
const FORBIDDEN_CHARS = /[\/\\:*?"<>|]/g;

// Windows 保留文件名
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

/**
 * 清理文件名，使其符合文件系统和 Vault 规范
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || filename.trim() === '') {
    return 'untitled';
  }

  let sanitized = filename
    .trim()
    // 替换禁止字符
    .replace(FORBIDDEN_CHARS, '-')
    // 移除路径遍历
    .replace(/\.\.\//g, '')
    .replace(/\/\//g, '/')
    .replace(/^\/+/, '')
    // 多个连续 - 替换为单个
    .replace(/-+/g, '-')
    // 去除首尾的 -
    .replace(/^-+|-+$/g, '')
    .trim();

  // 处理 Windows 保留名称
  if (WINDOWS_RESERVED.test(sanitized)) {
    sanitized = '_' + sanitized;
  }

  // 截断到 50 字符
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50).trim().replace(/-+$/, '');
  }

  return sanitized || 'untitled';
}
```

**Step 3: 运行测试**

Run: `npm test -- --run`

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add filename sanitizer with Windows reserved names check"
```

---

## Task 5: 工具函数 - 模板引擎

**Files:**
- Create: `utils/template.ts`
- Create: `utils/template.test.ts`

**Step 1: 编写测试**

创建 `utils/template.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderTemplate, DEFAULT_TEMPLATE } from './template';
import type { TemplateData } from '@/types';

describe('renderTemplate', () => {
  const mockData: TemplateData = {
    title: '测试文章',
    url: 'https://example.com/article',
    date: '2026-01-24',
    id: '20260124-a3f9',
    content: '# 正文内容\n\n这是测试内容。',
    siteName: 'Example Site',
    capturedAt: '2026-01-24 17:30:00',
  };

  it('should replace all template variables', () => {
    const result = renderTemplate(DEFAULT_TEMPLATE, mockData);
    expect(result).toContain('title: "测试文章"');
    expect(result).toContain('source: https://example.com/article');
    expect(result).toContain('id: 20260124-a3f9');
    expect(result).toContain('# 正文内容');
  });

  it('should include capturedAt if provided', () => {
    const result = renderTemplate(DEFAULT_TEMPLATE, mockData);
    expect(result).toContain('captured: 2026-01-24 17:30:00');
  });
});
```

**Step 2: 实现模板引擎**

创建 `utils/template.ts`:

```typescript
import type { TemplateData } from '@/types';

/**
 * 默认模板 - 符合用户 Vault Frontmatter 规范
 */
export const DEFAULT_TEMPLATE = `---
title: "{{title}}"
id: {{id}}
created: {{date}}
updated: {{date}}
captured: {{capturedAt}}
status: draft
category: resource
tags:
  - 收藏
source: {{url}}
site: {{siteName}}
---

{{content}}
`;

/**
 * 渲染模板
 */
export function renderTemplate(template: string, data: TemplateData): string {
  return template
    .replace(/\{\{title\}\}/g, data.title)
    .replace(/\{\{url\}\}/g, data.url)
    .replace(/\{\{date\}\}/g, data.date)
    .replace(/\{\{id\}\}/g, data.id)
    .replace(/\{\{content\}\}/g, data.content)
    .replace(/\{\{siteName\}\}/g, data.siteName || '')
    .replace(/\{\{capturedAt\}\}/g, data.capturedAt || data.date);
}
```

**Step 3: 运行测试，Commit**

```bash
npm test -- --run
git add .
git commit -m "feat: add template engine with Vault-compatible frontmatter"
```

---

## Task 6: 工具函数 - Markdown 转换器（含 GFM 插件）

**Files:**
- Create: `utils/converter.ts`
- Create: `utils/converter.test.ts`

**Step 1: 编写测试**

创建 `utils/converter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from './converter';

describe('htmlToMarkdown', () => {
  it('should convert basic HTML to Markdown', () => {
    const html = '<h1>标题</h1><p>段落内容</p>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('# 标题');
    expect(result).toContain('段落内容');
  });

  it('should convert tables (GFM)', () => {
    const html = '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('|');
    expect(result).toContain('A');
  });

  it('should convert strikethrough (GFM)', () => {
    const html = '<del>deleted</del>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('~~deleted~~');
  });

  it('should handle code blocks with language', () => {
    const html = '<pre><code class="language-javascript">const x = 1;</code></pre>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('```javascript');
  });

  it('should compress multiple empty lines', () => {
    const html = '<p>A</p><p></p><p></p><p></p><p>B</p>';
    const result = htmlToMarkdown(html);
    const emptyLines = (result.match(/\n\n\n/g) || []).length;
    expect(emptyLines).toBe(0);
  });
});
```

**Step 2: 实现转换器**

创建 `utils/converter.ts`:

```typescript
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// 启用 GFM 插件（表格、删除线、任务列表）
turndownService.use(gfm);

// 自定义规则：代码块语言识别
turndownService.addRule('fencedCodeBlock', {
  filter: (node) => {
    return (
      node.nodeName === 'PRE' &&
      node.firstChild &&
      node.firstChild.nodeName === 'CODE'
    );
  },
  replacement: (content, node) => {
    const codeNode = node.firstChild as Element;
    const className = codeNode.getAttribute('class') || '';
    const langMatch = className.match(/language-(\w+)/);
    const lang = langMatch ? langMatch[1] : '';
    const code = codeNode.textContent || '';
    return `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
  },
});

/**
 * 将 HTML 转换为 Markdown
 */
export function htmlToMarkdown(html: string): string {
  let markdown = turndownService.turndown(html);

  // 压缩连续空行（最多保留 2 个换行）
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  return markdown.trim();
}
```

**Step 3: 运行测试，Commit**

```bash
npm test -- --run
git add .
git commit -m "feat: add Markdown converter with GFM support"
```

---

## Task 7: 工具函数 - 内容提取器

**Files:**
- Create: `utils/extractor.ts`
- Create: `utils/extractor.test.ts`

**Step 1: 编写测试**

创建 `utils/extractor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractContent } from './extractor';

describe('extractContent', () => {
  it('should extract title from document', () => {
    const html = `
      <html>
        <head><title>测试标题</title></head>
        <body><article><p>内容</p></article></body>
      </html>
    `;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const result = extractContent(doc, 'https://example.com');
    expect(result.title).toBe('测试标题');
  });

  it('should extract content and filter noise', () => {
    const html = `
      <html><body>
        <nav>导航</nav>
        <article><p>正文内容</p></article>
        <footer>页脚</footer>
      </body></html>
    `;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const result = extractContent(doc, 'https://example.com');
    expect(result.content).toContain('正文内容');
  });
});
```

**Step 2: 实现提取器**

创建 `utils/extractor.ts`:

```typescript
import { Readability } from '@mozilla/readability';
import type { ExtractedContent } from '@/types';
import { preprocessDocument } from './zh-utils';

/**
 * 使用 Readability 提取网页正文
 */
export function extractContent(doc: Document, url: string): ExtractedContent {
  // 克隆文档
  const clonedDoc = doc.cloneNode(true) as Document;

  // 预处理（中文优化）
  preprocessDocument(clonedDoc, url);

  const reader = new Readability(clonedDoc);
  const article = reader.parse();

  if (!article) {
    return {
      title: doc.title || 'Untitled',
      content: doc.body?.innerHTML || '',
      excerpt: '',
      byline: '',
      siteName: new URL(url).hostname,
    };
  }

  return {
    title: article.title || doc.title || 'Untitled',
    content: article.content || '',
    excerpt: article.excerpt || '',
    byline: article.byline || '',
    siteName: article.siteName || new URL(url).hostname,
  };
}
```

**Step 3: 运行测试，Commit**

```bash
npm test -- --run
git add .
git commit -m "feat: add Readability-based content extractor"
```

---

## Task 8: 中文优化工具

**Files:**
- Create: `utils/zh-utils.ts`
- Create: `utils/zh-utils.test.ts`

**Step 1: 编写测试**

创建 `utils/zh-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isWechatArticle, addSpaceBetweenCJKAndLatin } from './zh-utils';

describe('isWechatArticle', () => {
  it('should detect wechat URL', () => {
    expect(isWechatArticle('https://mp.weixin.qq.com/s/abc123')).toBe(true);
    expect(isWechatArticle('https://example.com')).toBe(false);
  });
});

describe('addSpaceBetweenCJKAndLatin', () => {
  it('should add space between Chinese and English', () => {
    expect(addSpaceBetweenCJKAndLatin('中文English混排')).toBe('中文 English 混排');
  });

  it('should add space between Chinese and numbers', () => {
    expect(addSpaceBetweenCJKAndLatin('价格100元')).toBe('价格 100 元');
  });
});
```

**Step 2: 实现中文处理工具**

创建 `utils/zh-utils.ts`:

```typescript
/**
 * 检测是否为微信公众号文章
 */
export function isWechatArticle(url: string): boolean {
  return url.includes('mp.weixin.qq.com');
}

/**
 * 检测是否为知乎页面
 */
export function isZhihuPage(url: string): boolean {
  return url.includes('zhihu.com');
}

/**
 * 处理微信图片懒加载
 */
export function processWechatImages(doc: Document): void {
  doc.querySelectorAll('img[data-src]').forEach((img) => {
    const dataSrc = img.getAttribute('data-src');
    if (dataSrc) {
      img.setAttribute('src', dataSrc);
    }
    // 移除干扰样式
    img.removeAttribute('style');
    img.removeAttribute('width');
    img.removeAttribute('height');
  });
}

/**
 * 移除微信文章中的干扰元素
 */
export function removeWechatNoise(doc: Document): void {
  const selectors = [
    '#js_pc_qr_code',
    '#js_share_area',
    '.qr_code_pc',
    '.rich_media_area_extra',
    '.weapp_display_element',  // 小程序卡片
    'iframe',  // 嵌入视频（保留链接）
  ];

  selectors.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((el) => el.remove());
  });
}

/**
 * 处理知乎页面
 */
export function processZhihuPage(doc: Document): void {
  // 处理懒加载图片
  doc.querySelectorAll('img[data-src]').forEach((img) => {
    img.setAttribute('src', img.getAttribute('data-src') || '');
  });

  // 移除干扰
  doc.querySelectorAll('.RecommendationColumn, .HotAnswers, .AdCard').forEach((el) => el.remove());
}

/**
 * 中英文间添加空格
 */
export function addSpaceBetweenCJKAndLatin(text: string): string {
  const cjk = '\u2e80-\u2eff\u2f00-\u2fdf\u3040-\u309f\u30a0-\u30ff\u3100-\u312f\u3200-\u32ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f';

  return text
    .replace(new RegExp(`([${cjk}])([A-Za-z0-9])`, 'g'), '$1 $2')
    .replace(new RegExp(`([A-Za-z0-9])([${cjk}])`, 'g'), '$1 $2')
    .replace(/\s+/g, ' ');
}

/**
 * 预处理文档（根据网站类型）
 */
export function preprocessDocument(doc: Document, url: string): void {
  if (isWechatArticle(url)) {
    processWechatImages(doc);
    removeWechatNoise(doc);
  } else if (isZhihuPage(url)) {
    processZhihuPage(doc);
  }
}
```

**Step 3: 运行测试，Commit**

```bash
npm test -- --run
git add .
git commit -m "feat: add Chinese optimization utilities"
```

---

## Task 9: Content Script（程序化注入版本）

**Files:**
- Create: `entrypoints/content.ts`

**关键点**：这个文件会被程序化注入，不需要 `defineContentScript`。

**Step 1: 创建 Content Script**

创建 `entrypoints/content.ts`:

```typescript
// 这个脚本通过 chrome.scripting.executeScript 注入
// 不使用 defineContentScript（那是静态注入用的）

import { extractContent } from '@/utils/extractor';
import { htmlToMarkdown } from '@/utils/converter';
import type { ExtractionResult } from '@/types';

/**
 * 提取当前页面内容
 */
function extractCurrentPage(): ExtractionResult {
  try {
    const extracted = extractContent(document, window.location.href);
    const markdown = htmlToMarkdown(extracted.content);

    return {
      success: true,
      data: {
        title: extracted.title,
        markdown,
        url: window.location.href,
        siteName: extracted.siteName,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : '提取失败',
      },
    };
  }
}

// 执行提取并返回结果
// 这个返回值会被 chrome.scripting.executeScript 捕获
extractCurrentPage();
```

**注意**：WXT 可能需要特殊配置来支持程序化注入脚本。如果遇到问题，可以创建为普通 JS 文件。

**Step 2: 创建用于注入的包装文件**

创建 `public/inject.js`:

```javascript
// 这个文件会被直接注入到页面
(async () => {
  // 动态导入模块
  const { extractContent } = await import(chrome.runtime.getURL('utils/extractor.js'));
  const { htmlToMarkdown } = await import(chrome.runtime.getURL('utils/converter.js'));

  try {
    const extracted = extractContent(document, window.location.href);
    const markdown = htmlToMarkdown(extracted.content);

    return {
      success: true,
      data: {
        title: extracted.title,
        markdown,
        url: window.location.href,
        siteName: extracted.siteName,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: error.message || '提取失败',
      },
    };
  }
})();
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add content script for programmatic injection"
```

---

## Task 10: Background Service Worker（极简版）

**Files:**
- Create: `entrypoints/background.ts`

**Step 1: 实现极简 Service Worker**

创建 `entrypoints/background.ts`:

```typescript
export default defineBackground(() => {
  console.log('MarkDownload 中文版 已启动');

  // Service Worker 只负责日志和未来可能的扩展
  // 下载逻辑移到 Popup 中直接执行，避免 SW 生命周期问题
});
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add minimal background service worker"
```

---

## Task 11: Popup 界面 - HTML/CSS

**Files:**
- Create: `entrypoints/popup/index.html`
- Create: `entrypoints/popup/style.css`

**Step 1: 创建 Popup HTML（含复制按钮）**

创建 `entrypoints/popup/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=400, initial-scale=1.0">
  <title>MarkDownload</title>
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <div id="app">
    <!-- 加载状态 -->
    <div id="loading" class="loading">
      <div class="spinner"></div>
      <p>正在提取内容...</p>
    </div>

    <!-- 主界面 -->
    <div id="main" class="main hidden">
      <div class="header">
        <input type="text" id="title" class="title-input" placeholder="文章标题" autofocus>
        <div class="actions">
          <button id="btn-copy" class="btn" title="复制到剪贴板">📋</button>
          <button id="btn-download" class="btn btn-primary" title="下载">⬇️ 下载</button>
        </div>
      </div>

      <div class="preview-container">
        <pre id="preview" class="preview"></pre>
      </div>

      <div class="status-bar">
        <span id="status"></span>
        <span id="word-count"></span>
      </div>
    </div>

    <!-- 错误状态 -->
    <div id="error" class="error hidden">
      <p>❌ 提取失败</p>
      <p id="error-message"></p>
      <button id="btn-retry" class="btn">重试</button>
    </div>
  </div>

  <script type="module" src="./main.ts"></script>
</body>
</html>
```

**Step 2: 创建样式**

创建 `entrypoints/popup/style.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 420px;
  min-height: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: #333;
  background: #fff;
}

.hidden { display: none !important; }

/* 加载状态 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #666;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #4a90d9;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 头部 */
.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.title-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.title-input:focus {
  outline: none;
  border-color: #4a90d9;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
}

.actions {
  display: flex;
  gap: 8px;
}

/* 按钮 */
.btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  background: #f5f5f5;
}

.btn-primary {
  background: #4a90d9;
  color: white;
  border-color: #4a90d9;
}

.btn-primary:hover {
  background: #3a7bc8;
}

/* 预览区 */
.preview-container {
  height: 260px;
  overflow: auto;
  padding: 12px;
  background: #f9f9f9;
}

.preview {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #444;
}

/* 状态栏 */
.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 12px;
  color: #888;
  border-top: 1px solid #eee;
}

/* 错误状态 */
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  padding: 20px;
  text-align: center;
  color: #d32f2f;
}

.error p { margin-bottom: 12px; }
#error-message { color: #666; font-size: 12px; }
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add popup HTML and CSS with copy button"
```

---

## Task 12: Popup 界面 - 交互逻辑（含会话级 ID）

**Files:**
- Create: `entrypoints/popup/main.ts`

**Step 1: 实现 Popup 逻辑**

创建 `entrypoints/popup/main.ts`:

```typescript
import { generateId, formatDate, formatDateTime } from '@/utils/id';
import { sanitizeFilename } from '@/utils/filename';
import { renderTemplate, DEFAULT_TEMPLATE } from '@/utils/template';
import type { TemplateData, ExtractionResult } from '@/types';

// DOM 元素
const loadingEl = document.getElementById('loading')!;
const mainEl = document.getElementById('main')!;
const errorEl = document.getElementById('error')!;
const titleInput = document.getElementById('title') as HTMLInputElement;
const previewEl = document.getElementById('preview')!;
const statusEl = document.getElementById('status')!;
const wordCountEl = document.getElementById('word-count')!;
const btnDownload = document.getElementById('btn-download')!;
const btnCopy = document.getElementById('btn-copy')!;
const btnRetry = document.getElementById('btn-retry')!;
const errorMessageEl = document.getElementById('error-message')!;

// ⚠️ 会话级状态：ID 和日期只生成一次
let sessionId: string;
let sessionDate: string;
let sessionCapturedAt: string;
let currentData: { title: string; markdown: string; url: string; siteName?: string } | null = null;

async function init() {
  showLoading();

  // 生成会话级 ID 和日期（整个会话只生成一次）
  sessionId = generateId();
  sessionDate = formatDate();
  sessionCapturedAt = formatDateTime();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id || !tab.url) {
      throw new Error('无法获取当前标签页');
    }

    // 程序化注入 Content Script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],  // WXT 构建后的文件名
    });

    const result = results[0]?.result as ExtractionResult;

    if (!result || !result.success || !result.data) {
      throw new Error(result?.error?.message || '提取失败');
    }

    currentData = result.data;
    showMain();

    titleInput.value = currentData.title;
    updatePreview();
    updateStatus(`来源: ${new URL(currentData.url).hostname}`);
  } catch (error) {
    showError(error instanceof Error ? error.message : '未知错误');
  }
}

function updatePreview() {
  if (!currentData) return;

  const templateData: TemplateData = {
    title: titleInput.value || currentData.title,
    url: currentData.url,
    date: sessionDate,        // 使用会话级日期
    id: sessionId,            // 使用会话级 ID
    content: currentData.markdown,
    siteName: currentData.siteName,
    capturedAt: sessionCapturedAt,
  };

  const markdown = renderTemplate(DEFAULT_TEMPLATE, templateData);
  previewEl.textContent = markdown;

  // 更新字数统计
  const charCount = markdown.length;
  wordCountEl.textContent = `${charCount} 字符`;
}

function getFullMarkdown(): string {
  if (!currentData) return '';

  const templateData: TemplateData = {
    title: titleInput.value || currentData.title,
    url: currentData.url,
    date: sessionDate,
    id: sessionId,
    content: currentData.markdown,
    siteName: currentData.siteName,
    capturedAt: sessionCapturedAt,
  };

  return renderTemplate(DEFAULT_TEMPLATE, templateData);
}

// ⚠️ 下载直接在 Popup 执行，不经过 Service Worker
async function handleDownload() {
  if (!currentData) return;

  const filename = sanitizeFilename(titleInput.value || currentData.title);
  const markdown = getFullMarkdown();

  // 使用 data URL 避免 Blob URL 生命周期问题
  const dataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);

  try {
    await chrome.downloads.download({
      url: dataUrl,
      filename: `${filename}.md`,
      saveAs: true,
    });
    updateStatus('✅ 下载成功');
  } catch (error) {
    updateStatus(`❌ 下载失败: ${error}`);
  }
}

async function handleCopy() {
  const markdown = getFullMarkdown();

  try {
    await navigator.clipboard.writeText(markdown);
    updateStatus('✅ 已复制到剪贴板');
  } catch (error) {
    updateStatus('❌ 复制失败');
  }
}

// UI 状态切换
function showLoading() {
  loadingEl.classList.remove('hidden');
  mainEl.classList.add('hidden');
  errorEl.classList.add('hidden');
}

function showMain() {
  loadingEl.classList.add('hidden');
  mainEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
}

function showError(message: string) {
  loadingEl.classList.add('hidden');
  mainEl.classList.add('hidden');
  errorEl.classList.remove('hidden');
  errorMessageEl.textContent = message;
}

function updateStatus(message: string) {
  statusEl.textContent = message;
}

// 事件绑定
titleInput.addEventListener('input', updatePreview);
btnDownload.addEventListener('click', handleDownload);
btnCopy.addEventListener('click', handleCopy);
btnRetry.addEventListener('click', init);

// 启动
init();
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: implement popup with session-stable ID and copy function"
```

---

## Task 13: 创建图标

**Files:**
- Create: `public/icon/icon.svg`
- Create: `public/icon/icon-16.png`
- Create: `public/icon/icon-48.png`
- Create: `public/icon/icon-128.png`

**Step 1: 创建 SVG 图标**

创建 `public/icon/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="20" fill="#4a90d9"/>
  <text x="64" y="75" text-anchor="middle" font-size="56" font-family="Arial, sans-serif" fill="white" font-weight="bold">M↓</text>
</svg>
```

**Step 2: 转换为 PNG**

使用在线工具（如 https://svgtopng.com）或 ImageMagick 转换

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add extension icons"
```

---

## Task 14: 端到端测试

**Step 1: 构建**

Run: `npm run build`

**Step 2: 在 Chrome 加载扩展**

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 加载 `.output/chrome-mv3/`

**Step 3: 测试场景**

- [ ] 普通网页：点击图标 → 预览 → 下载
- [ ] 微信公众号：验证图片正确提取
- [ ] 知乎：验证内容完整
- [ ] 修改标题：验证 ID 不变
- [ ] 复制功能：验证剪贴板内容
- [ ] 下载文件：验证 Frontmatter 格式

**Step 4: Commit**

```bash
git add .
git commit -m "test: verify end-to-end functionality"
```

---

## Task 15: 完善 README

**Files:**
- Modify: `README.md`

创建 `README.md`:

```markdown
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

## 开发

\`\`\`bash
npm run dev     # 开发模式
npm run build   # 构建
npm test        # 测试
npm run lint    # 代码检查
\`\`\`

## 许可

MIT
```

**Commit**

```bash
git add .
git commit -m "docs: add README with privacy statement"
```

---

## 任务总结

| Task | 描述 | 关键改动 |
|------|------|----------|
| 1 | 项目初始化 | 添加 ESLint/Prettier |
| 2 | WXT 配置 | 移除 Solid，添加类型定义 |
| 3 | ID 生成器 | 添加 formatDateTime |
| 4 | 文件名处理 | Windows 保留字检查 |
| 5 | 模板引擎 | 添加 capturedAt、siteName |
| 6 | Markdown 转换器 | GFM 插件、压缩空行 |
| 7 | 内容提取器 | 集成中文预处理 |
| 8 | 中文优化 | 微信/知乎深度处理 |
| 9 | Content Script | 程序化注入版本 |
| 10 | Service Worker | 极简版（逻辑移到 Popup） |
| 11 | Popup HTML/CSS | 添加复制按钮 |
| 12 | Popup 逻辑 | 会话级 ID、data URL 下载 |
| 13 | 图标 | SVG + PNG |
| 14 | E2E 测试 | 验证所有功能 |
| 15 | README | 隐私声明 |

---

> **执行时请使用**: superpowers:executing-plans skill
