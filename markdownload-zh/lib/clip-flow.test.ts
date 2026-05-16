import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clipTab, type ClipResult } from './clip-flow';

// Mock chrome APIs
const mockExecuteScript = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();

vi.stubGlobal('chrome', {
  scripting: { executeScript: mockExecuteScript },
  runtime: {
    onMessage: {
      addListener: mockAddListener,
      removeListener: mockRemoveListener,
    },
  },
});

describe('clipTab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns extracted markdown on success', async () => {
    // 1st call: clear old result + set requestId
    mockExecuteScript.mockResolvedValueOnce([{ result: undefined }]);
    // 2nd call: inject extractor.js
    mockExecuteScript.mockResolvedValueOnce([{ result: undefined }]);
    // 3rd call (poll): return result
    mockExecuteScript.mockResolvedValueOnce([{
      result: {
        requestId: 'test-rid',
        success: true,
        data: { title: 'Test', markdown: '# Hello', url: 'https://example.com', siteName: 'example.com' },
      },
    }]);

    const promise = clipTab(42, 'https://example.com');
    await vi.advanceTimersByTimeAsync(250);
    const result = await promise;

    expect(result.success).toBe(true);
    expect(result.data?.title).toBe('Test');
    expect(result.data?.markdown).toBe('# Hello');
  });

  it('returns error for restricted URLs', async () => {
    const result = await clipTab(1, 'chrome://extensions/');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PAGE_NOT_ACCESSIBLE');
    expect(mockExecuteScript).not.toHaveBeenCalled();
  });

  it('returns error when extraction fails', async () => {
    mockExecuteScript.mockResolvedValueOnce([{ result: undefined }]);
    mockExecuteScript.mockResolvedValueOnce([{ result: undefined }]);
    // Poll returns failure
    mockExecuteScript.mockResolvedValueOnce([{
      result: {
        requestId: 'test-rid',
        success: false,
        error: { code: 'EXTRACTION_FAILED', message: '提取失败' },
      },
    }]);

    const promise = clipTab(42, 'https://example.com');
    await vi.advanceTimersByTimeAsync(250);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('EXTRACTION_FAILED');
  });

  it('times out after max poll attempts', async () => {
    mockExecuteScript.mockResolvedValueOnce([{ result: undefined }]);
    mockExecuteScript.mockResolvedValueOnce([{ result: undefined }]);
    // All polls return null (no result)
    mockExecuteScript.mockResolvedValue([{ result: null }]);

    const promise = clipTab(42, 'https://example.com');
    // Advance past the 30s timeout
    await vi.advanceTimersByTimeAsync(31_000);
    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TIMEOUT');
  });

  it('handles injection errors gracefully', async () => {
    mockExecuteScript.mockRejectedValueOnce(new Error('Cannot access tab'));

    const result = await clipTab(42, 'https://example.com');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PAGE_NOT_ACCESSIBLE');
  });
});
