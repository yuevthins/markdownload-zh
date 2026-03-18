const FORBIDDEN_CHARS = /[\/\\:*?"<>|]/g;

// Windows 保留文件名
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

/**
 * 清理文件名，使其符合文件系统和 Vault 规范
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || filename.trim() === '') {
    return 'untitled';
  }

  let sanitized = filename
    .trim()
    // 替换禁止字符
    .replace(FORBIDDEN_CHARS, '-')
    // 移除路径遍历（包括 .. 和多斜杠）
    .replace(/\.\./g, '')
    .replace(/\/+/g, '-')
    .replace(/^-+/, '')
    // 多个连续 - 替换为单个
    .replace(/-+/g, '-')
    // 去除首尾的 -
    .replace(/^-+|-+$/g, '')
    .trim();

  // 处理 Windows 保留名称
  if (WINDOWS_RESERVED.test(sanitized)) {
    sanitized = '_' + sanitized;
  }

  // 截断到 200 字符（中文标题通常较长，50 字符不够用）
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200).trim().replace(/-+$/, '');
  }

  return sanitized || 'untitled';
}
