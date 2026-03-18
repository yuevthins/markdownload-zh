# MarkDownload 内容提取修复 - 设计文档

> 创建于 2026-01-25 | 基于实际用户测试反馈

## 目标

修复 MarkDownload 中文版在实际使用中发现的内容提取问题，提高提取质量。

## 问题清单

| 优先级 | 问题 | 涉及站点 | 根因 |
|--------|------|----------|------|
| **P0** | 导航噪声未过滤 | TikTok Shop | 无专门预处理 |
| **P0** | 零宽空格残留 | TikTok Shop | Turndown 未清理 |
| **P1** | 图片 alt 固定为"图片" | 微信 | 微信图片无 alt |
| **P2** | URL encoding 未还原 | TikTok Shop | 链接格式问题 |

## 技术方案

### 1. TikTok Shop 站点预处理（P0）

在 `preprocessChineseSites()` 中新增 TikTok Shop 处理逻辑。

**需要移除的选择器**：
```javascript
// 导航面包屑
'.breadcrumb', '[class*="breadcrumb"]', '[class*="Breadcrumb"]',
// 侧边栏导航
'.sidebar', '[class*="sidebar"]', '[class*="Sidebar"]', 'aside',
// 页脚导航
'.pagination', '[class*="pagination"]', '[class*="next-prev"]',
'[class*="helpful"]', // "以上内容对您是否有帮助"
// 顶部导航
'nav', 'header', '[role="navigation"]',
// React SPA 常见噪声
'[class*="menu"]', '[class*="Menu"]'
```

**目标 URL 匹配**：
- `seller.tiktokshopglobalselling.com`
- `seller.tiktokglobalshop.com`

### 2. 零宽空格清理（P0）

在 Turndown 转换后添加后处理步骤，移除零宽字符。

**需要清理的字符**：
| 字符 | Unicode | 名称 |
|------|---------|------|
| `​` | U+200B | Zero Width Space |
| `‌` | U+200C | Zero Width Non-Joiner |
| `‍` | U+200D | Zero Width Joiner |
| `` | U+FEFF | BOM / Zero Width No-Break Space |

**实现位置**：
- `extractContent()` 函数中，`markdown.trim()` 前添加清理逻辑
- 使用正则：`/[\u200B\u200C\u200D\uFEFF]/g`

### 3. 图片 alt 智能提取（P1）

当 `img.alt` 为空或为通用占位符时，尝试从以下来源推断：

1. **figcaption**：如果图片在 `<figure>` 中，使用 `<figcaption>` 内容
2. **data-alt**：某些站点把 alt 放在 data 属性中
3. **title 属性**：部分站点使用 title 代替 alt
4. **aria-label**：无障碍标签
5. **周围文字**：图片前/后的短文本（限 50 字符）

**fallback**：如果都没有，保持空字符串（而不是"图片"）

### 4. URL Encoding 处理（P2）

在链接转换时，对常见的误编码进行还原：

| 编码 | 原字符 | 场景 |
|------|--------|------|
| `%23` | `#` | 锚点 |
| `%3F` | `?` | 查询参数 |
| `%26` | `&` | 参数分隔 |

**实现方式**：在 Turndown 的链接处理规则中添加 decode 逻辑。

## 文件改动

| 文件 | 改动 |
|------|------|
| `entrypoints/extractor.unlisted.ts` | +TikTok 预处理、+零宽清理、+alt 智能提取 |
| `utils/text-cleanup.ts` (新建) | 零宽字符清理、URL decode 工具函数 |
| `utils/text-cleanup.test.ts` (新建) | 测试用例 |

## 验证方式

1. **单元测试**：新增工具函数测试
2. **端到端测试**：用提供的两个 URL 验证

## 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 过度移除内容 | TikTok 正文被误删 | 选择器精确匹配，避免过泛 |
| alt 推断错误 | 图片描述不准确 | 仅在原 alt 为空时推断 |
| URL decode 破坏链接 | 有效链接变无效 | 只处理明确的误编码模式 |

## 下一步

进入 Phase 2 制定详细执行计划。
