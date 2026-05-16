/**
 * utils/obsidian-uri 单测
 *
 * 验证：
 *  - URI 格式正确 + 各字段编码（中文、空格、斜杠、保留字符）
 *  - 100KB 阈值降级（URI 编码后整体长度）
 *  - 边界：空 vault / 空 folder
 */
import { describe, expect, it } from 'vitest';

import { buildObsidianUri, OBSIDIAN_URI_MAX_BYTES } from './obsidian-uri';

describe('utils/obsidian-uri', () => {
  describe('正常构建', () => {
    it('简单输入 → 返回 type: "uri" 和合法 URI', () => {
      const out = buildObsidianUri({
        content: '# Hello\n\nWorld',
        title: 'My Note',
        vault: 'Notes',
        folder: 'Inbox',
      });
      expect(out.type).toBe('uri');
      if (out.type !== 'uri') return;
      expect(out.value.startsWith('obsidian://new?')).toBe(true);
      // 包含 vault 参数
      expect(out.value).toContain('vault=Notes');
      // file 参数包含 folder/title（编码后）
      expect(out.value).toMatch(/file=Inbox(?:%2F|\/)My%20Note/);
      // content 参数存在且包含被编码的内容
      expect(out.value).toContain('content=');
    });

    it('content 中的换行、井号、空格被正确编码', () => {
      const out = buildObsidianUri({
        content: '# Title\n\nLine 1\nLine 2',
        title: 't',
        vault: 'v',
        folder: 'f',
      });
      expect(out.type).toBe('uri');
      if (out.type !== 'uri') return;
      // %23 = #, %0A = \n, %20 = space
      expect(out.value).toContain('%23');
      expect(out.value).toContain('%0A');
      expect(out.value).toContain('%20');
    });
  });

  describe('特殊字符编码', () => {
    it('中文 vault / title / folder 都被 percent-encode', () => {
      const out = buildObsidianUri({
        content: 'body',
        title: '中文标题',
        vault: '我的笔记库',
        folder: '收件箱',
      });
      expect(out.type).toBe('uri');
      if (out.type !== 'uri') return;
      // 不应残留未编码的中文
      expect(out.value).not.toMatch(/[\u4e00-\u9fa5]/);
      // 反向验证：解码回来应等于原文
      const params = new URL(out.value).searchParams;
      expect(params.get('vault')).toBe('我的笔记库');
      expect(params.get('file')).toBe('收件箱/中文标题');
    });

    it('title 含斜杠会被编码（防止当作子路径）', () => {
      const out = buildObsidianUri({
        content: 'body',
        title: 'a/b',
        vault: 'v',
        folder: 'f',
      });
      expect(out.type).toBe('uri');
      if (out.type !== 'uri') return;
      // file 参数解码后 folder 仍为 f，title 含字面 "a/b"
      const params = new URL(out.value).searchParams;
      expect(params.get('file')).toBe('f/a/b');
    });

    it('vault / folder / title 含 & = ? 等保留字符也能正确编码', () => {
      const out = buildObsidianUri({
        content: 'body',
        title: 'q?a&b=c',
        vault: 'V&V',
        folder: 'F=F',
      });
      expect(out.type).toBe('uri');
      if (out.type !== 'uri') return;
      const params = new URL(out.value).searchParams;
      expect(params.get('vault')).toBe('V&V');
      expect(params.get('file')).toBe('F=F/q?a&b=c');
    });
  });

  describe('空字段', () => {
    it('folder 为空时 file 只是 title，不带斜杠前缀', () => {
      const out = buildObsidianUri({
        content: 'body',
        title: 'note',
        vault: 'v',
        folder: '',
      });
      expect(out.type).toBe('uri');
      if (out.type !== 'uri') return;
      const params = new URL(out.value).searchParams;
      expect(params.get('file')).toBe('note');
    });

    it('vault 为空时返回 fallback（无效目标，避免 Obsidian 报错）', () => {
      const out = buildObsidianUri({
        content: 'body',
        title: 'note',
        vault: '',
        folder: 'Inbox',
      });
      expect(out.type).toBe('fallback');
      if (out.type !== 'fallback') return;
      expect(out.reason).toBe('empty-vault');
    });
  });

  describe('100KB 阈值降级', () => {
    it('URI 总长度刚好低于阈值 → uri', () => {
      // 留 200 byte 余量给 URI 前缀和参数名
      const content = 'a'.repeat(OBSIDIAN_URI_MAX_BYTES - 200);
      const out = buildObsidianUri({
        content,
        title: 't',
        vault: 'v',
        folder: 'f',
      });
      expect(out.type).toBe('uri');
    });

    it('URI 总长度超过阈值 → fallback', () => {
      // 远超阈值
      const content = 'a'.repeat(OBSIDIAN_URI_MAX_BYTES * 2);
      const out = buildObsidianUri({
        content,
        title: 't',
        vault: 'v',
        folder: 'f',
      });
      expect(out.type).toBe('fallback');
      if (out.type !== 'fallback') return;
      expect(out.reason).toBe('too-large');
    });

    it('编码后膨胀到超过阈值 → fallback（中文每字符 ×3）', () => {
      // 每个中文 utf-8 3 字节，encodeURIComponent 后变 %XX%XX%XX = 9 字符
      // 字符串数量取阈值的 1/8，编码后 ≈ 1.125x 阈值
      const repeat = Math.ceil(OBSIDIAN_URI_MAX_BYTES / 8);
      const content = '中'.repeat(repeat);
      const out = buildObsidianUri({
        content,
        title: 't',
        vault: 'v',
        folder: 'f',
      });
      expect(out.type).toBe('fallback');
    });
  });

  describe('阈值常量', () => {
    it('OBSIDIAN_URI_MAX_BYTES 是 100 KiB', () => {
      expect(OBSIDIAN_URI_MAX_BYTES).toBe(100 * 1024);
    });
  });
});
