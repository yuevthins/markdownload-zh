/**
 * 提取日期各部分（内部共享）
 */
function getDateParts(date: Date): { year: number; month: string; day: string } {
  return {
    year: date.getFullYear(),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
  };
}

/**
 * 生成唯一 ID，格式：YYYYMMDD-xxxx
 */
export function generateId(date: Date = new Date()): string {
  const { year, month, day } = getDateParts(date);
  const randomPart = Math.random().toString(36).substring(2, 6);
  return `${year}${month}${day}-${randomPart}`;
}

/**
 * 格式化日期为 YYYY-MM-DD（本地时区）
 */
export function formatDate(date: Date = new Date()): string {
  const { year, month, day } = getDateParts(date);
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss（用于 capturedAt）
 */
export function formatDateTime(date: Date = new Date()): string {
  const datePart = formatDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${datePart} ${hours}:${minutes}:${seconds}`;
}
