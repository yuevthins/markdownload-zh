/**
 * utils/popup-mode 单测
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { popupFileForMode, applyPopupForMode } from './popup-mode';

describe('utils/popup-mode', () => {
  describe('popupFileForMode', () => {
    it('quick 模式返回空串（移除 popup → 触发 onClicked）', () => {
      expect(popupFileForMode('quick')).toBe('');
    });

    it('preview 模式返回 popup.html', () => {
      expect(popupFileForMode('preview')).toBe('popup.html');
    });

    it('obsidian 模式返回 popup.html', () => {
      expect(popupFileForMode('obsidian')).toBe('popup.html');
    });
  });

  describe('applyPopupForMode', () => {
    let setPopup: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      setPopup = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('chrome', { action: { setPopup } });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('quick 模式 → 调用 chrome.action.setPopup 设空串', async () => {
      await applyPopupForMode('quick');
      expect(setPopup).toHaveBeenCalledWith({ popup: '' });
    });

    it('preview 模式 → 调用 setPopup 设 popup.html', async () => {
      await applyPopupForMode('preview');
      expect(setPopup).toHaveBeenCalledWith({ popup: 'popup.html' });
    });

    it('obsidian 模式 → 调用 setPopup 设 popup.html', async () => {
      await applyPopupForMode('obsidian');
      expect(setPopup).toHaveBeenCalledWith({ popup: 'popup.html' });
    });

    it('chrome.action.setPopup 不存在时静默跳过（不抛错）', async () => {
      vi.stubGlobal('chrome', { action: {} });
      await expect(applyPopupForMode('quick')).resolves.toBeUndefined();
    });
  });
});
