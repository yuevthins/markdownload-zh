import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleQuickClip } from './quick-clip';

// Mock dependencies
vi.mock('@/lib/clip-flow', () => ({
  clipTab: vi.fn(),
}));
vi.mock('@/lib/badge', () => ({
  showBadgeSuccess: vi.fn(),
  showBadgeError: vi.fn(),
}));
vi.mock('@/utils/settings', () => ({
  getSettings: vi.fn(),
  DEFAULT_SETTINGS: { mode: 'quick', vaultName: '', vaultFolder: 'Inbox' },
}));
vi.mock('@/utils/id', () => ({
  generateId: () => '20260516-abcd',
  formatDate: () => '2026-05-16',
  formatDateTime: () => '2026-05-16 20:00:00',
}));
vi.mock('@/utils/template', () => ({
  renderTemplate: (_tpl: string, data: { content: string }) => `---\ntitle: "Test"\n---\n\n${data.content}`,
  buildMarkdown: (data: { markdown: string }) => `---\ntitle: "Test"\n---\n\n${data.markdown}`,
  DEFAULT_TEMPLATE: 'mock-template',
}));
vi.mock('@/utils/filename', () => ({
  sanitizeFilename: (s: string) => s,
}));
vi.mock('@/utils/obsidian-uri', () => ({
  buildObsidianUri: vi.fn(),
}));

const mockTabsUpdate = vi.fn().mockResolvedValue(undefined);
const mockTabsCreate = vi.fn().mockResolvedValue({ id: 99 });
const mockDownload = vi.fn().mockResolvedValue(1);
const mockOnChanged = { addListener: vi.fn(), removeListener: vi.fn() };
const mockExecuteScript = vi.fn().mockResolvedValue([{ result: undefined }]);

vi.stubGlobal('chrome', {
  tabs: { update: mockTabsUpdate, create: mockTabsCreate },
  downloads: { download: mockDownload, onChanged: mockOnChanged },
  scripting: { executeScript: mockExecuteScript },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
});

import { clipTab } from '@/lib/clip-flow';
import { showBadgeSuccess, showBadgeError } from '@/lib/badge';
import { getSettings } from '@/utils/settings';
import { buildObsidianUri } from '@/utils/obsidian-uri';

describe('handleQuickClip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows success badge and downloads file when no vault configured', async () => {
    vi.mocked(clipTab).mockResolvedValue({
      success: true,
      data: { title: 'Test', markdown: '# Hello', url: 'https://example.com', siteName: 'example.com' },
    });
    vi.mocked(getSettings).mockResolvedValue({ mode: 'quick', vaultName: '', vaultFolder: 'Inbox' });

    await handleQuickClip(42, 'https://example.com');

    expect(clipTab).toHaveBeenCalledWith(42, 'https://example.com');
    expect(showBadgeSuccess).toHaveBeenCalledWith(42);
  });

  it('uses obsidian:// URI when vault is configured', async () => {
    vi.mocked(clipTab).mockResolvedValue({
      success: true,
      data: { title: 'Test', markdown: '# Hello', url: 'https://example.com', siteName: 'example.com' },
    });
    vi.mocked(getSettings).mockResolvedValue({ mode: 'quick', vaultName: 'MyVault', vaultFolder: 'Inbox' });
    vi.mocked(buildObsidianUri).mockReturnValue({ type: 'clipboard', uri: 'obsidian://new?file=Test&vault=MyVault&clipboard', content: '# Hello' });

    // Mock executeScript for clipboard write
    mockExecuteScript.mockResolvedValueOnce([{ result: undefined }]);

    await handleQuickClip(42, 'https://example.com');

    expect(buildObsidianUri).toHaveBeenCalled();
    expect(mockTabsCreate).toHaveBeenCalledWith({ url: 'obsidian://new?file=Test&vault=MyVault&clipboard', active: false });
    expect(showBadgeSuccess).toHaveBeenCalledWith(42);
  });

  it('falls back to download when clipboard write fails', async () => {
    vi.mocked(clipTab).mockResolvedValue({
      success: true,
      data: { title: 'Test', markdown: '# Hello', url: 'https://example.com', siteName: 'example.com' },
    });
    vi.mocked(getSettings).mockResolvedValue({ mode: 'quick', vaultName: 'MyVault', vaultFolder: 'Inbox' });
    vi.mocked(buildObsidianUri).mockReturnValue({ type: 'clipboard', uri: 'obsidian://new?file=Test&vault=MyVault&clipboard', content: '# Hello' });

    // Mock executeScript for clipboard write - fails
    mockExecuteScript.mockRejectedValueOnce(new Error('clipboard failed'));
    // Mock executeScript for content script download - succeeds
    mockExecuteScript.mockResolvedValueOnce([{ result: undefined }]);

    await handleQuickClip(42, 'https://example.com');

    expect(showBadgeSuccess).toHaveBeenCalledWith(42);
  });

  it('shows error badge when extraction fails', async () => {
    vi.mocked(clipTab).mockResolvedValue({
      success: false,
      error: { code: 'EXTRACTION_FAILED', message: '提取失败' },
    });
    vi.mocked(getSettings).mockResolvedValue({ mode: 'quick', vaultName: '', vaultFolder: 'Inbox' });

    await handleQuickClip(42, 'https://example.com');

    expect(showBadgeError).toHaveBeenCalledWith(42);
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it('shows error badge on restricted pages without crashing', async () => {
    vi.mocked(clipTab).mockResolvedValue({
      success: false,
      error: { code: 'PAGE_NOT_ACCESSIBLE', message: '无法在此页面使用扩展' },
    });
    vi.mocked(getSettings).mockResolvedValue({ mode: 'quick', vaultName: '', vaultFolder: 'Inbox' });

    await handleQuickClip(42, 'chrome://extensions/');

    expect(showBadgeError).toHaveBeenCalledWith(42);
  });
});
