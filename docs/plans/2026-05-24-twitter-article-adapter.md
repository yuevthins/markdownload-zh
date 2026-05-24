# PRD: X/Twitter Article 适配器 — 排版清理与模式区分

## Problem Statement

用户在 X（Twitter）上剪藏长文（Article）时，下载的 Markdown 存在严重排版问题：评论区混入正文、大量 UI 元素残留（浏览量、升级提示、广告）、站内 @mention 链接变成无意义的相对路径 Markdown 链接、作者信息冗余重复。当前适配器不区分 Article 和普通 Tweet，统一抓取最多 8 条 `<article>` 元素，导致 Article 页面的评论被当作正文提取。

## Solution

创建独立的 X/Twitter 站点适配器，区分 Article（长文）和 Tweet（短推文/Thread）两种模式。Article 模式只提取第一个 `<article>` 元素作为正文，移除所有 UI 噪音和评论。两种模式共享站内链接清理逻辑（站内链接转纯文本，外部链接保留）。检测浏览器翻译状态并在 frontmatter 中标记。

## User Stories

1. As a user clipping an X Article, I want only the article body extracted without comments, so that my Markdown file contains clean content.
2. As a user clipping an X Article, I want UI elements (view count, "upgrade to premium", analytics links, quote links) removed, so that my Markdown has no platform noise.
3. As a user clipping an X Article, I want the author's username extracted into frontmatter metadata, so that I know who wrote the article without it cluttering the body.
4. As a user clipping an X Article, I want internal @mention links (e.g. `[@user](/user)`) converted to plain text `@user`, so that my Markdown doesn't have broken relative links.
5. As a user clipping an X Article, I want external links (e.g. to openai.com) preserved as full Markdown links, so that I can still navigate to referenced resources.
6. As a user clipping an X Article, I want x.com search links (cashtags like `$browser`) converted to plain text, so that platform-specific navigation doesn't pollute my notes.
7. As a user clipping a regular X Tweet or Thread, I want the same link cleanup applied (internal links → plain text), so that the experience is consistent.
8. As a user clipping a regular X Tweet or Thread, I want redundant avatar/username blocks cleaned up, so that the output is readable.
9. As a user who has browser translation enabled, I want a `translated: true` marker in frontmatter, so that I'm aware the content may contain machine translation artifacts.
10. As a user clipping an X Article with images, I want the article images preserved but promotional/UI images removed, so that only content-relevant media appears.
11. As a user, I want the adapter to detect Article mode automatically (via URL pattern or DOM structure), so that I don't need to configure anything.

## Implementation Decisions

### Module: X/Twitter Site Adapter (`twitter.ts`)

A new standalone adapter file replacing the current `extractTwitter` function in `ai-sites.ts`. Uses `customExtract` to handle both modes.

**Mode detection:**
- Article mode: URL contains `/article/` path segment, OR the first `<article>` contains long-form content indicators (multiple `<h2>` headings, substantial text length)
- Tweet mode: all other x.com/twitter.com URLs

**Article mode extraction:**
- Take only the first `<article>` element
- Remove UI noise via selectors: `[role="group"]`, `[href*="/analytics"]`, `[href*="/quotes"]`, subscribe/premium CTAs, timestamp links
- Extract author from `[data-testid="User-Name"]` and return as part of title or content header
- Strip the author avatar/handle block from body

**Shared link cleanup (both modes):**
- DOM-level transformation in `customExtract` before returning HTML to `htmlToMarkdown`
- For each `<a>` element: if `href` is relative (starts with `/`) or points to `x.com`/`twitter.com` internal pages → replace the `<a>` with a `<span>` containing its text content
- External links (different domain, absolute URL) → preserved as-is

**Translation detection:**
- Check `document.documentElement.classList` for `translated-*` class or `<html>` having a `translate` attribute
- If detected, the adapter signals this via a convention (e.g., appending a comment or the pipeline adds frontmatter field)
- Implementation: since the current template system uses fixed fields, the simplest approach is to append `translated: true` to the siteName or add it as a line after frontmatter. Alternatively, extend `TemplateData` to support optional extra fields.

**Registration:**
- Register in `lib/sites/index.ts` in the "complex sites" section (position 1), before `aiSiteAdapters`
- Remove `extractTwitter` and the x-twitter entry from `ai-sites.ts`

**Match pattern:**
- `match: (url) => /x\.com|twitter\.com/.test(url)` — function matcher to cover both domains

### Adapter interface usage

```typescript
// SiteAdapter shape used:
{
  id: 'x-twitter',
  match: (url: string) => boolean,
  customExtract: (doc, url) => { title, content } | null,
  siteName: 'X / Twitter',
}
```

The adapter returns HTML from `customExtract`; the pipeline's `htmlToMarkdown` (defuddle) handles the Markdown conversion. This means link cleanup must happen at DOM level before returning `content`.

### Translation detection approach

Since `TemplateData` currently has no extensible metadata field, the pragmatic approach is:
- Detect translation in the adapter
- If translated, prepend a YAML-compatible comment or note in the returned content (e.g., a blockquote at the top: `> ⚠️ 此页面在剪藏时处于浏览器翻译状态，内容可能包含机翻痕迹。`)

This avoids modifying the template system for a single edge case.

## Testing Decisions

**What makes a good test:** Tests should verify the external behavior of the adapter — given a specific DOM input and URL, assert on the extracted title and markdown content. Tests should not assert on internal implementation details like which helper functions were called.

**Modules to test:**
- `twitter.ts` adapter — the primary module under test

**Test cases:**
1. Article mode: given an Article DOM, only the first article's content is extracted, no comments
2. Article mode: UI noise elements (analytics, quotes, premium CTA) are absent from output
3. Article mode: internal @mention links become plain text in output
4. Article mode: external links are preserved as Markdown links
5. Tweet mode: existing behavior preserved (multiple tweets extracted)
6. Tweet mode: internal links cleaned up
7. Translation detection: when `translated-*` class present, output contains translation warning
8. Mode detection: URL with `/article/` triggers Article mode
9. Mode detection: regular status URL triggers Tweet mode

**Prior art:** `ai-sites.test.ts` — uses the same `extract()` helper pattern with JSDOM, asserts on `adapter.id`, `result.title`, and `markdown` content presence/absence.

## Out of Scope

- **AI-powered content correction** (B 层): No LLM API calls for fixing machine translation errors. This would break the privacy model (zero network requests).
- **Frontmatter template system changes**: No modification to `TemplateData` interface or `DEFAULT_TEMPLATE`. Translation warning is handled inline in content.
- **Twitter Spaces / Video content**: Only text articles and tweets are handled.
- **Authentication-gated content**: The adapter works with whatever DOM is available; it does not handle login walls.
- **Thread unrolling improvements**: The existing multi-tweet extraction logic for Threads is preserved as-is (beyond link cleanup).

## Further Notes

- The existing `SOCIAL_NOISE` selector list in `ai-sites.ts` contains useful selectors that should be reused in the new adapter (sidebar, trends, DM drawer, etc.)
- The adapter should be defensive: if Article mode detection fails or the first `<article>` has no substantial content, fall back to Tweet mode behavior
- This change increases the adapted site count from 68 to 68 (no new sites, but improved quality for existing x.com/twitter.com coverage)
