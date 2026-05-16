/**
 * 用户设置模块（chrome.storage.sync 读写 + 变更订阅）
 *
 * 三种交互模式：
 *  - preview：当前默认行为，弹窗预览 markdown 后手动下载/复制
 *  - obsidian：弹窗预览，下载按钮通过 obsidian:// URI 保存到 vault
 *  - quick：无弹窗，点击图标后台直接保存（badge 反馈）
 *
 * Vault 配置：
 *  - vaultName：Obsidian vault 名称（obsidian:// URI 的 vault 参数）
 *  - vaultFolder：vault 内的目标文件夹，默认 "Inbox"
 *
 * 注：本模块依赖 chrome.storage.sync。MV3 中读写 chrome.storage 需要 manifest
 * 声明 storage 权限（免提示，不需用户审批）。
 */

export type Mode = 'preview' | 'obsidian' | 'quick';

export interface Settings {
  mode: Mode;
  vaultName: string;
  vaultFolder: string;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'preview',
  vaultName: '',
  vaultFolder: 'Inbox',
};

const STORAGE_KEYS: (keyof Settings)[] = ['mode', 'vaultName', 'vaultFolder'];

/** 把 chrome.storage 读出的散字段合并成完整 Settings（缺失的取默认值） */
function mergeWithDefaults(stored: Partial<Settings>): Settings {
  return {
    mode: stored.mode ?? DEFAULT_SETTINGS.mode,
    vaultName: stored.vaultName ?? DEFAULT_SETTINGS.vaultName,
    vaultFolder: stored.vaultFolder ?? DEFAULT_SETTINGS.vaultFolder,
  };
}

/** 读取当前设置，缺失字段返回默认值 */
export async function getSettings(): Promise<Settings> {
  const stored = (await chrome.storage.sync.get(STORAGE_KEYS as string[])) as Partial<Settings>;
  return mergeWithDefaults(stored);
}

/** 写入部分设置；未出现的字段保持原值。空对象传入是 no-op。 */
export async function saveSettings(partial: Partial<Settings>): Promise<void> {
  if (Object.keys(partial).length === 0) return;
  await chrome.storage.sync.set(partial);
}

/**
 * 订阅 sync 区域的设置变更，回调收到合并后的最新 Settings。
 * 返回 unsubscribe 函数，调用后不再触发。
 */
export function onSettingsChanged(callback: (settings: Settings) => void): () => void {
  const listener = async (
    _changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
    areaName: string
  ) => {
    if (areaName !== 'sync') return;
    const settings = await getSettings();
    callback(settings);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
