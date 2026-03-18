/**
 * 懒加载图片处理工具测试
 */
import { describe, it, expect } from 'vitest';
import { normalizeImageUrl, isPlaceholderSrc } from './lazy-image';

describe('normalizeImageUrl', () => {
  const baseUrl = 'https://example.com/article/page.html';

  it('处理绝对 URL', () => {
    expect(normalizeImageUrl('https://cdn.example.com/img.jpg', baseUrl))
      .toBe('https://cdn.example.com/img.jpg');
  });

  it('处理协议相对 URL', () => {
    expect(normalizeImageUrl('//cdn.example.com/img.jpg', baseUrl))
      .toBe('https://cdn.example.com/img.jpg');
  });

  it('处理绝对路径', () => {
    expect(normalizeImageUrl('/images/photo.png', baseUrl))
      .toBe('https://example.com/images/photo.png');
  });

  it('处理相对路径', () => {
    expect(normalizeImageUrl('../images/photo.png', baseUrl))
      .toBe('https://example.com/images/photo.png');
    expect(normalizeImageUrl('./photo.png', baseUrl))
      .toBe('https://example.com/article/photo.png');
  });

  it('拒绝空值', () => {
    expect(normalizeImageUrl('', baseUrl)).toBeNull();
    expect(normalizeImageUrl('   ', baseUrl)).toBeNull();
  });

  it('拒绝 data: URI', () => {
    expect(normalizeImageUrl('data:image/gif;base64,R0lGOD', baseUrl)).toBeNull();
  });

  it('拒绝 javascript: URI', () => {
    expect(normalizeImageUrl('javascript:void(0)', baseUrl)).toBeNull();
  });
});

describe('isPlaceholderSrc', () => {
  it('识别空值为占位图', () => {
    expect(isPlaceholderSrc(null)).toBe(true);
    expect(isPlaceholderSrc('')).toBe(true);
  });

  it('识别 data: URI 为占位图', () => {
    expect(isPlaceholderSrc('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP')).toBe(true);
  });

  it('识别常见占位符关键词', () => {
    expect(isPlaceholderSrc('https://example.com/placeholder.png')).toBe(true);
    expect(isPlaceholderSrc('https://example.com/loading.gif')).toBe(true);
    expect(isPlaceholderSrc('https://example.com/blank.jpg')).toBe(true);
    expect(isPlaceholderSrc('https://example.com/1x1.gif')).toBe(true);
    expect(isPlaceholderSrc('https://example.com/lazy-load.png')).toBe(true);
    expect(isPlaceholderSrc('https://example.com/grey.png')).toBe(true);
  });

  it('识别 CDN 占位图路径', () => {
    expect(isPlaceholderSrc('https://cdn.example.com/default.png')).toBe(true);
    expect(isPlaceholderSrc('https://cdn.example.com/blank.gif')).toBe(true);
  });

  it('不误判正常图片', () => {
    expect(isPlaceholderSrc('https://example.com/photo.jpg')).toBe(false);
    expect(isPlaceholderSrc('https://cdn.example.com/article-image.png')).toBe(false);
  });
});
