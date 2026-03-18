/**
 * 提取的内容结构
 */
export interface ExtractedContent {
  title: string;
  content: string; // HTML 格式
  excerpt: string;
  byline: string;
  siteName: string;
}

/**
 * 模板数据
 */
export interface TemplateData {
  title: string;
  url: string;
  date: string;
  id: string;
  content: string; // Markdown 格式
  siteName?: string;
  capturedAt?: string; // 含时分秒
}

/**
 * 提取结果数据
 */
export interface ExtractedData {
  title: string;
  markdown: string;
  url: string;
  siteName?: string;
}

/**
 * 提取结果消息（统一类型，用于 extractor 和 popup 通信）
 */
export interface ExtractResult {
  requestId?: string;
  success: boolean;
  data?: ExtractedData;
  error?: {
    code: 'PAGE_NOT_ACCESSIBLE' | 'EXTRACTION_FAILED' | 'TIMEOUT' | 'NO_CONTENT';
    message: string;
  };
}

/**
 * @deprecated 使用 ExtractResult 代替
 */
export type ExtractionResult = ExtractResult;

/**
 * 全局 Window 扩展（用于 extractor 和 popup 通信）
 */
declare global {
  interface Window {
    __markdownload_extracted?: ExtractResult;
  }
}
