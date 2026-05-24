/**
 * Pipeline + Site Adapter 内部类型
 */

/**
 * 站点适配器接口
 */
export interface SiteAdapter {
  id: string;
  match: string | RegExp | ((url: string) => boolean);

  // Stage 1: 预处理
  removeSelectors?: string[];
  preprocess?: (doc: Document, url: string) => Promise<void> | void;

  // Stage 2: 提取
  fallbackSelectors?: string[];
  /** 是否需要访问原始文档（用于 Shadow DOM 读取） */
  needsSourceDoc?: boolean;
  customExtract?: (
    doc: Document,
    url: string,
    sourceDoc?: Document
  ) =>
    | Promise<{ title: string; content: string } | null>
    | { title: string; content: string }
    | null;

  siteName?: string;
}

/**
 * Pipeline 输出结果
 */
export interface PipelineResult {
  success: boolean;
  data?: {
    title: string;
    markdown: string;
    url: string;
    siteName?: string;
  };
  error?: string;
  /** 阶段诊断信息（调试/测试用） */
  diagnostics?: {
    /** 匹配到的适配器 ID，null 表示通用提取 */
    adapter: string | null;
    /** 各阶段耗时 ms */
    stages: Record<string, number>;
    /** 提取内容字符数 */
    contentLength: number;
  };
}
