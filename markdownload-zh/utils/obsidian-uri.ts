/**
 * 构造 obsidian:// URI，把剪藏内容直接保存到 Obsidian vault。
 *
 * URI 格式：
 *   obsidian://new?vault={vault}&file={folder/title}&content={markdown}
 *
 * 阈值：URI 整体长度（编码后）超过 100 KiB 时返回 fallback，由调用方走文件下载。
 *
 * 注意：obsidian:// 通过浏览器导航（chrome.tabs.update / window.open）打开，
 * 不需要任何额外 Chrome 权限。
 */

/** URI 总长度上限（编码后）—— Obsidian 接收过大 URI 时会失败/截断 */
export const OBSIDIAN_URI_MAX_BYTES = 100 * 1024;

export interface BuildObsidianUriInput {
  content: string;
  title: string;
  vault: string;
  /** 空串表示放到 vault 根目录 */
  folder: string;
}

export type ObsidianUriResult =
  | { type: 'uri'; value: string }
  | { type: 'fallback'; reason: 'empty-vault' | 'too-large' };

/**
 * 拼 file 参数：folder + '/' + title。folder 为空时只用 title。
 * 注意 folder 与 title 各自独立 encode，但 '/' 自身不编码（Obsidian 把它当目录分隔符）。
 */
function buildFilePath(folder: string, title: string): string {
  const encodedTitle = encodeURIComponent(title);
  if (!folder) return encodedTitle;
  return `${encodeURIComponent(folder)}/${encodedTitle}`;
}

/**
 * 构造 obsidian:// URI。空 vault 或 URI 过大时返回 fallback。
 */
export function buildObsidianUri(input: BuildObsidianUriInput): ObsidianUriResult {
  if (!input.vault) {
    return { type: 'fallback', reason: 'empty-vault' };
  }

  const params = [
    `vault=${encodeURIComponent(input.vault)}`,
    `file=${buildFilePath(input.folder, input.title)}`,
    `content=${encodeURIComponent(input.content)}`,
  ];
  const uri = `obsidian://new?${params.join('&')}`;

  if (uri.length > OBSIDIAN_URI_MAX_BYTES) {
    return { type: 'fallback', reason: 'too-large' };
  }

  return { type: 'uri', value: uri };
}
