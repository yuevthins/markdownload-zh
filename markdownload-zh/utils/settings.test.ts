/**
 * utils/settings 单测
 *
 * 用 vitest mock 替换 chrome.storage.sync + chrome.storage.onChanged，
 * 验证 getSettings / saveSettings / onSettingsChanged 的行为。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  onSettingsChanged,
  type Settings,
} from './settings';

type StorageMap = Record<string, unknown>;
type ChangeListener = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
  areaName: string
) => void;

function makeChromeMock() {
  const store: StorageMap = {};
  const listeners: ChangeListener[] = [];

  const sync = {
    get: vi.fn((keys: string | string[] | null) => {
      if (keys === null || keys === undefined) {
        return Promise.resolve({ ...store });
      }
      const arr = Array.isArray(keys) ? keys : [keys];
      const out: StorageMap = {};
      for (const k of arr) {
        if (k in store) out[k] = store[k];
      }
      return Promise.resolve(out);
    }),
    set: vi.fn((items: StorageMap) => {
      const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
      for (const [k, v] of Object.entries(items)) {
        const oldValue = store[k];
        store[k] = v;
        changes[k] = { oldValue, newValue: v };
      }
      // 触发监听器
      for (const fn of listeners) fn(changes, 'sync');
      return Promise.resolve();
    }),
  };

  return {
    chrome: {
      storage: {
        sync,
        onChanged: {
          addListener: vi.fn((fn: ChangeListener) => listeners.push(fn)),
          removeListener: vi.fn((fn: ChangeListener) => {
            const i = listeners.indexOf(fn);
            if (i >= 0) listeners.splice(i, 1);
          }),
        },
      },
    },
    /** 测试辅助：直接读 mock 内部 store */
    _peek: () => ({ ...store }),
  };
}

describe('utils/settings', () => {
  let mock: ReturnType<typeof makeChromeMock>;

  beforeEach(() => {
    mock = makeChromeMock();
    vi.stubGlobal('chrome', mock.chrome);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('DEFAULT_SETTINGS', () => {
    it('mode 默认是 preview，vaultName 是空串，vaultFolder 是 Inbox', () => {
      expect(DEFAULT_SETTINGS).toEqual<Settings>({
        mode: 'preview',
        vaultName: '',
        vaultFolder: 'Inbox',
      });
    });
  });

  describe('getSettings', () => {
    it('storage 没有任何字段时返回默认值', async () => {
      const s = await getSettings();
      expect(s).toEqual(DEFAULT_SETTINGS);
    });

    it('storage 有部分字段时与默认值合并', async () => {
      await mock.chrome.storage.sync.set({ mode: 'quick', vaultName: 'MyVault' });
      const s = await getSettings();
      expect(s).toEqual<Settings>({
        mode: 'quick',
        vaultName: 'MyVault',
        vaultFolder: 'Inbox', // 仍取默认
      });
    });

    it('storage 字段完整时原样返回', async () => {
      const full: Settings = { mode: 'obsidian', vaultName: 'Notes', vaultFolder: 'Clip' };
      await mock.chrome.storage.sync.set(full);
      const s = await getSettings();
      expect(s).toEqual(full);
    });
  });

  describe('saveSettings', () => {
    it('部分写入与已有字段合并，未覆盖字段保持不变', async () => {
      await mock.chrome.storage.sync.set({
        mode: 'preview',
        vaultName: 'Old',
        vaultFolder: 'Inbox',
      });
      await saveSettings({ mode: 'quick' });
      const s = await getSettings();
      expect(s).toEqual<Settings>({
        mode: 'quick',
        vaultName: 'Old',
        vaultFolder: 'Inbox',
      });
    });

    it('空对象传入是 no-op，不抛错', async () => {
      await expect(saveSettings({})).resolves.toBeUndefined();
    });
  });

  describe('onSettingsChanged', () => {
    it('storage 改变时回调收到合并后的最新 Settings', async () => {
      const cb = vi.fn();
      onSettingsChanged(cb);
      await saveSettings({ mode: 'obsidian', vaultName: 'V' });
      // 放到下一个 microtask 让回调跑完
      await Promise.resolve();
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith<[Settings]>({
        mode: 'obsidian',
        vaultName: 'V',
        vaultFolder: 'Inbox',
      });
    });

    it('忽略非 sync 区域的变更', async () => {
      const cb = vi.fn();
      onSettingsChanged(cb);
      // 模拟 local 区域变更
      const listener = mock.chrome.storage.onChanged.addListener.mock.calls[0][0];
      listener({ mode: { newValue: 'quick' } }, 'local');
      await Promise.resolve();
      expect(cb).not.toHaveBeenCalled();
    });

    it('返回的 unsubscribe 调用后不再回调', async () => {
      const cb = vi.fn();
      const unsubscribe = onSettingsChanged(cb);
      unsubscribe();
      await saveSettings({ mode: 'quick' });
      await Promise.resolve();
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
