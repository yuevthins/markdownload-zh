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
    const longName =
      '这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常长的标题';
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
