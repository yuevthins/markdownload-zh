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
    expect(removeZeroWidthChars('正常文本 Normal Text')).toBe(
      '正常文本 Normal Text'
    );
  });

  it('处理空字符串', () => {
    expect(removeZeroWidthChars('')).toBe('');
  });

  it('处理行尾零宽字符', () => {
    expect(removeZeroWidthChars('第一行\u200B\n第二行\u200B')).toBe(
      '第一行\n第二行'
    );
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

  it('识别带空格的占位符', () => {
    expect(isPlaceholderAlt('  图片  ')).toBe(true);
    expect(isPlaceholderAlt(' image ')).toBe(true);
  });

  it('有意义的 alt 不是占位符', () => {
    expect(isPlaceholderAlt('黄仁勋在上海')).toBe(false);
    expect(isPlaceholderAlt('A chart showing growth')).toBe(false);
    expect(isPlaceholderAlt('产品截图')).toBe(false);
  });
});
