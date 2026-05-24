import type { TemplateData, ExtractedData } from '@/types';

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
 * 转义 YAML 双引号字符串中的特殊字符
 */
function escapeYamlQuoted(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * 渲染模板（单次遍历，防止替换结果被后续模式再处理）
 */
export function renderTemplate(template: string, data: TemplateData): string {
  const replacements: Record<string, string> = {
    title: escapeYamlQuoted(data.title),
    url: data.url,
    date: data.date,
    id: data.id,
    content: data.content,
    siteName: data.siteName || '',
    capturedAt: data.capturedAt || data.date,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in replacements ? replacements[key] : match;
  });
}

/**
 * 将提取结果转为完整 Markdown（含 Frontmatter）。
 * 统一入口，消除 popup 和 quick-clip 的重复构造逻辑。
 */
export function buildMarkdown(
  data: ExtractedData,
  opts: { id: string; date: string; capturedAt: string; titleOverride?: string }
): string {
  const templateData: TemplateData = {
    title: opts.titleOverride || data.title,
    url: data.url,
    date: opts.date,
    id: opts.id,
    content: data.markdown,
    siteName: data.siteName,
    capturedAt: opts.capturedAt,
  };
  return renderTemplate(DEFAULT_TEMPLATE, templateData);
}
