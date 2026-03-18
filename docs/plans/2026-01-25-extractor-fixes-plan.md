# MarkDownload 内容提取修复 - 执行计划

> 创建于 2026-01-25 | Phase 2 产出

## Tasks

### Task 1: 创建文本清理工具模块

**文件**: `markdownload-zh/utils/text-cleanup.ts`

**代码**:
```typescript
/**
 * 文本清理工具
 */

/**
 * 零宽字符正则
 */
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF]/g;

/**
 * 移除零宽字符
 */
export function removeZeroWidthChars(text: string): string {
  return text.replace(ZERO_WIDTH_CHARS, '');
}

/**
 * 通用占位符 alt 文本（需要被替换的）
 */
const PLACEHOLDER_ALTS = [
  '图片',
  'image',
  'img',
  'photo',
  '图',
  '',
];

/**
 * 判断是否为占位符 alt
 */
export function isPlaceholderAlt(alt: string | null): boolean {
  if (!alt) return true;
  const normalized = alt.trim().toLowerCase();
  return PLACEHOLDER_ALTS.includes(normalized);
}
```

**验证**: `npm test -- utils/text-cleanup.test.ts`

---

### Task 2: 创建文本清理工具测试

**文件**: `markdownload-zh/utils/text-cleanup.test.ts`

**代码**:
```typescript
import { describe, it, expect } from 'vitest';
import { removeZeroWidthChars, isPlaceholderAlt } from './text-cleanup';

describe('removeZeroWidthChars', () => {
  it('移除零宽空格 U+200B', () => {
    expect(removeZeroWidthChars('hello\u200Bworld')).toBe('helloworld');
  });

  it('移除零宽非连接符 U+200C', () => {
    expect(removeZeroWidthChars('hello\u200Cworld')).toBe('helloworld');
  });

  it('移除零宽连接符 U+200D', () => {
    expect(removeZeroWidthChars('hello\u200Dworld')).toBe('helloworld');
  });

  it('移除 BOM U+FEFF', () => {
    expect(removeZeroWidthChars('\uFEFFhello')).toBe('hello');
  });

  it('移除混合零宽字符', () => {
    expect(removeZeroWidthChars('a\u200Bb\u200Cc\u200Dd\uFEFFe')).toBe('abcde');
  });

  it('保留正常文本', () => {
    expect(removeZeroWidthChars('正常文本 Normal Text')).toBe('正常文本 Normal Text');
  });

  it('处理空字符串', () => {
    expect(removeZeroWidthChars('')).toBe('');
  });
});

describe('isPlaceholderAlt', () => {
  it('识别"图片"为占位符', () => {
    expect(isPlaceholderAlt('图片')).toBe(true);
  });

  it('识别"image"为占位符（忽略大小写）', () => {
    expect(isPlaceholderAlt('Image')).toBe(true);
    expect(isPlaceholderAlt('IMAGE')).toBe(true);
  });

  it('识别空字符串为占位符', () => {
    expect(isPlaceholderAlt('')).toBe(true);
  });

  it('识别 null 为占位符', () => {
    expect(isPlaceholderAlt(null)).toBe(true);
  });

  it('有意义的 alt 不是占位符', () => {
    expect(isPlaceholderAlt('黄仁勋在上海')).toBe(false);
    expect(isPlaceholderAlt('A chart showing growth')).toBe(false);
  });
});
```

**验证**: `npm test -- utils/text-cleanup.test.ts`

---

### Task 3: 添加 TikTok Shop 站点预处理

**文件**: `markdownload-zh/entrypoints/extractor.unlisted.ts`

**改动位置**: `preprocessChineseSites()` 函数末尾

**新增代码**:
```typescript
  // TikTok Shop 学习中心
  if (url.includes('seller.tiktokshopglobalselling.com') ||
      url.includes('seller.tiktokglobalshop.com')) {
    const tiktokSelectors = [
      // 导航面包屑
      '[class*="breadcrumb"]', '[class*="Breadcrumb"]',
      // 侧边栏
      '[class*="sidebar"]', '[class*="Sidebar"]', '[class*="side-nav"]',
      // 页脚和分页
      '[class*="pagination"]', '[class*="Pagination"]',
      '[class*="helpful"]', '[class*="Helpful"]', // "是否有帮助"
      '[class*="next-article"]', '[class*="prev-article"]',
      // 顶部导航
      'nav', 'header', '[role="navigation"]', '[role="banner"]',
      // 菜单
      '[class*="menu"]', '[class*="Menu"]',
      // React SPA 常见容器
      '[class*="academy"]', '[class*="Academy"]', // CB Academy 标题
    ];
    doc.querySelectorAll(tiktokSelectors.join(', ')).forEach((el) => el.remove());
  }
```

**验证**: 构建后测试 TikTok Shop 页面

---

### Task 4: 添加零宽字符清理逻辑

**文件**: `markdownload-zh/entrypoints/extractor.unlisted.ts`

**改动 1**: 导入语句（文件顶部）
```typescript
import { removeZeroWidthChars } from '@/utils/text-cleanup';
```

**改动 2**: `extractContent()` 函数中，修改 markdown 赋值

找到:
```typescript
const markdown = turndown.turndown(article.content);
```

替换为:
```typescript
const markdown = removeZeroWidthChars(turndown.turndown(article.content));
```

**改动 3**: `getFallbackContent()` 函数中，同样处理

找到:
```typescript
const markdown = turndown.turndown(contentEl.innerHTML);
```

替换为:
```typescript
const markdown = removeZeroWidthChars(turndown.turndown(contentEl.innerHTML));
```

**验证**: 构建后测试 TikTok Shop 页面

---

### Task 5: 改进图片 alt 提取逻辑

**文件**: `markdownload-zh/entrypoints/extractor.unlisted.ts`

**改动位置**: `createTurndownService()` 函数中

**新增辅助函数**（在 `createTurndownService` 函数内部或之前）:
```typescript
/**
 * 智能提取图片 alt 文本
 */
function getSmartAlt(img: HTMLImageElement): string {
  // 1. 原有 alt
  const originalAlt = img.getAttribute('alt');
  if (originalAlt && !isPlaceholderAlt(originalAlt)) {
    return originalAlt;
  }

  // 2. data-alt
  const dataAlt = img.getAttribute('data-alt');
  if (dataAlt && dataAlt.trim()) {
    return dataAlt.trim();
  }

  // 3. title
  const title = img.getAttribute('title');
  if (title && title.trim()) {
    return title.trim();
  }

  // 4. aria-label
  const ariaLabel = img.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim();
  }

  // 5. figcaption（如果在 figure 中）
  const figure = img.closest('figure');
  if (figure) {
    const figcaption = figure.querySelector('figcaption');
    if (figcaption && figcaption.textContent) {
      const captionText = figcaption.textContent.trim();
      if (captionText.length <= 100) {
        return captionText;
      }
    }
  }

  // 6. 返回空（不使用"图片"）
  return '';
}
```

**修改 Turndown 规则**: 在 `lazyImages` 规则的 replacement 中使用 `getSmartAlt`

找到:
```typescript
const alt = img.getAttribute('alt') || '';
```

替换为:
```typescript
const alt = getSmartAlt(img);
```

**需要导入**: `isPlaceholderAlt`（从 text-cleanup.ts）

**验证**: 构建后测试微信公众号页面

---

### Task 6: 运行完整测试

**命令**:
```bash
cd markdownload-zh && npm test
```

**预期**: 所有测试通过（包括新增的 text-cleanup 测试）

---

### Task 7: 构建并验证

**命令**:
```bash
cd markdownload-zh && npm run build
```

**手动验证**:
1. 在 Chrome 加载 `.output/chrome-mv3/`
2. 测试 TikTok Shop 页面（检查面包屑/页脚是否移除）
3. 测试微信公众号页面（检查图片 alt）

---

## 验收清单

- [ ] `utils/text-cleanup.ts` 创建并测试通过
- [ ] TikTok Shop 噪声过滤正常
- [ ] 零宽字符被清理
- [ ] 图片 alt 智能提取工作
- [ ] 所有现有测试继续通过
- [ ] 构建成功
