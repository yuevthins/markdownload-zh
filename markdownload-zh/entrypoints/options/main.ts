/**
 * Options page 入口
 *
 * - 加载时把当前 settings 反映到表单
 * - 任意控件 change → saveSettings()，无需 submit
 */
import { getSettings, saveSettings, type Mode, type Settings } from '@/utils/settings';

export interface OptionsDom {
  modeRadios: NodeListOf<HTMLInputElement>;
  vaultNameInput: HTMLInputElement;
  vaultFolderInput: HTMLInputElement;
  saveStatus: HTMLElement;
}

export function queryDom(root: ParentNode = document): OptionsDom {
  return {
    modeRadios: root.querySelectorAll<HTMLInputElement>('input[name="mode"]'),
    vaultNameInput: root.querySelector<HTMLInputElement>('#vault-name')!,
    vaultFolderInput: root.querySelector<HTMLInputElement>('#vault-folder')!,
    saveStatus: root.querySelector<HTMLElement>('#save-status')!,
  };
}

/** 把 settings 反映到表单 */
export function applySettingsToDom(dom: OptionsDom, settings: Settings): void {
  for (const radio of dom.modeRadios) {
    radio.checked = radio.value === settings.mode;
  }
  dom.vaultNameInput.value = settings.vaultName;
  dom.vaultFolderInput.value = settings.vaultFolder;
}

/** 从表单读出 partial Settings（用于保存） */
export function readSettingsFromDom(dom: OptionsDom): Settings {
  let mode: Mode = 'preview';
  for (const radio of dom.modeRadios) {
    if (radio.checked) {
      mode = radio.value as Mode;
      break;
    }
  }
  return {
    mode,
    vaultName: dom.vaultNameInput.value,
    vaultFolder: dom.vaultFolderInput.value,
  };
}

/** 闪一下"已保存"提示 */
export function flashSaved(dom: OptionsDom, durationMs = 1500): void {
  dom.saveStatus.textContent = '✓ 已保存';
  dom.saveStatus.classList.add('visible');
  window.setTimeout(() => {
    dom.saveStatus.classList.remove('visible');
  }, durationMs);
}

/** 绑定 change 事件 → 保存 */
export function bindAutosave(dom: OptionsDom): void {
  const handler = async () => {
    const next = readSettingsFromDom(dom);
    await saveSettings(next);
    flashSaved(dom);
  };
  for (const radio of dom.modeRadios) {
    radio.addEventListener('change', handler);
  }
  dom.vaultNameInput.addEventListener('change', handler);
  dom.vaultFolderInput.addEventListener('change', handler);
}

/** 初始化：读 settings → 填表单 → 绑定 autosave */
export async function init(root: ParentNode = document): Promise<void> {
  const dom = queryDom(root);
  const settings = await getSettings();
  applySettingsToDom(dom, settings);
  bindAutosave(dom);
}

// 自动启动（仅在浏览器扩展运行时；vitest+jsdom 环境下没有 chrome 全局，跳过副作用）
const hasExtensionRuntime =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as { chrome?: { storage?: unknown } }).chrome?.storage !== 'undefined';

if (typeof document !== 'undefined' && hasExtensionRuntime) {
  if (document.readyState !== 'loading') {
    void init();
  } else {
    document.addEventListener('DOMContentLoaded', () => void init());
  }
}
