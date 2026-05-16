/**
 * Options page 单测
 *
 * jsdom 环境构造一份与 index.html 同形状的 DOM，验证 main.ts 的 init / autosave 行为。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

import {
  applySettingsToDom,
  bindAutosave,
  init,
  queryDom,
  readSettingsFromDom,
} from './main';
import type { Settings } from '@/utils/settings';

type StorageMap = Record<string, unknown>;

function makeChromeMock() {
  const store: StorageMap = {};
  const sync = {
    get: vi.fn((keys: string[] | null) => {
      if (!keys) return Promise.resolve({ ...store });
      const out: StorageMap = {};
      for (const k of keys) if (k in store) out[k] = store[k];
      return Promise.resolve(out);
    }),
    set: vi.fn((items: StorageMap) => {
      Object.assign(store, items);
      return Promise.resolve();
    }),
  };
  return {
    chrome: {
      storage: {
        sync,
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    },
    _peek: () => ({ ...store }),
    _seed: (s: StorageMap) => Object.assign(store, s),
  };
}

function loadOptionsHtml(): string {
  const htmlPath = path.resolve(__dirname, './index.html');
  return fs.readFileSync(htmlPath, 'utf-8');
}

function mountOptionsDom(): HTMLElement {
  document.body.innerHTML = loadOptionsHtml().replace(
    /<script[\s\S]*?<\/script>/g,
    '' // 抹掉 main.ts 的 <script>，避免 jsdom 解析失败
  );
  return document.body;
}

describe('options page', () => {
  let mock: ReturnType<typeof makeChromeMock>;

  beforeEach(() => {
    mock = makeChromeMock();
    vi.stubGlobal('chrome', mock.chrome);
    mountOptionsDom();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('queryDom 找到所有控件', () => {
    const dom = queryDom();
    expect(dom.modeRadios.length).toBe(3);
    expect(dom.vaultNameInput).toBeTruthy();
    expect(dom.vaultFolderInput).toBeTruthy();
    expect(dom.saveStatus).toBeTruthy();
  });

  it('applySettingsToDom 把 settings 反映到表单', () => {
    const dom = queryDom();
    const settings: Settings = { mode: 'obsidian', vaultName: 'Notes', vaultFolder: 'Clip' };
    applySettingsToDom(dom, settings);

    const checked = Array.from(dom.modeRadios).find((r) => r.checked);
    expect(checked?.value).toBe('obsidian');
    expect(dom.vaultNameInput.value).toBe('Notes');
    expect(dom.vaultFolderInput.value).toBe('Clip');
  });

  it('readSettingsFromDom 从表单读出当前值', () => {
    const dom = queryDom();
    applySettingsToDom(dom, {
      mode: 'quick',
      vaultName: 'V',
      vaultFolder: 'F',
    });
    expect(readSettingsFromDom(dom)).toEqual<Settings>({
      mode: 'quick',
      vaultName: 'V',
      vaultFolder: 'F',
    });
  });

  it('init 加载时把存储的设置反映到表单', async () => {
    mock._seed({ mode: 'quick', vaultName: 'MyVault', vaultFolder: 'Daily' });
    await init();
    const dom = queryDom();
    const checked = Array.from(dom.modeRadios).find((r) => r.checked);
    expect(checked?.value).toBe('quick');
    expect(dom.vaultNameInput.value).toBe('MyVault');
    expect(dom.vaultFolderInput.value).toBe('Daily');
  });

  it('bindAutosave：切换 mode radio → chrome.storage.sync.set 被调用', async () => {
    const dom = queryDom();
    applySettingsToDom(dom, {
      mode: 'preview',
      vaultName: '',
      vaultFolder: 'Inbox',
    });
    bindAutosave(dom);

    // 切到 quick
    const quickRadio = Array.from(dom.modeRadios).find((r) => r.value === 'quick')!;
    quickRadio.checked = true;
    quickRadio.dispatchEvent(new Event('change', { bubbles: true }));

    // 等 microtask
    await Promise.resolve();
    await Promise.resolve();

    expect(mock.chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'quick' })
    );
  });

  it('bindAutosave：编辑 vaultName → 写入对应字段', async () => {
    const dom = queryDom();
    applySettingsToDom(dom, {
      mode: 'preview',
      vaultName: '',
      vaultFolder: 'Inbox',
    });
    bindAutosave(dom);

    dom.vaultNameInput.value = 'NewVault';
    dom.vaultNameInput.dispatchEvent(new Event('change', { bubbles: true }));

    await Promise.resolve();
    await Promise.resolve();

    expect(mock.chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ vaultName: 'NewVault' })
    );
  });
});
