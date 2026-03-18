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

  it('should escape double quotes in title for valid YAML', () => {
    const data = { ...mockData, title: 'Say "hello" world' };
    const result = renderTemplate(DEFAULT_TEMPLATE, data);
    expect(result).toContain('title: "Say \\"hello\\" world"');
  });

  it('should not re-process earlier substitution results (single-pass)', () => {
    const data = { ...mockData, content: 'Text with {{siteName}} literal' };
    const result = renderTemplate(DEFAULT_TEMPLATE, data);
    // content 中的 {{siteName}} 应保留原样，不被替换为 siteName 值
    expect(result).toContain('Text with {{siteName}} literal');
  });
});
