import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showBadgeSuccess, showBadgeError, BADGE_COLORS } from './badge';

const mockSetBadgeText = vi.fn().mockResolvedValue(undefined);
const mockSetBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined);

vi.stubGlobal('chrome', {
  action: {
    setBadgeText: mockSetBadgeText,
    setBadgeBackgroundColor: mockSetBadgeBackgroundColor,
  },
});

describe('badge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports correct badge colors', () => {
    expect(BADGE_COLORS.success).toBe('#0E8A16');
    expect(BADGE_COLORS.failure).toBe('#CB2431');
  });

  it('showBadgeSuccess sets ✓ green badge and clears after 2s', async () => {
    showBadgeSuccess(1);

    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '✓', tabId: 1 });
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#0E8A16', tabId: 1 });

    await vi.advanceTimersByTimeAsync(2000);
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '', tabId: 1 });
  });

  it('showBadgeError sets ✗ red badge and clears after 3s', async () => {
    showBadgeError(2);

    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '✗', tabId: 2 });
    expect(mockSetBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#CB2431', tabId: 2 });

    await vi.advanceTimersByTimeAsync(3000);
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '', tabId: 2 });
  });

  it('does not clear badge before timeout', async () => {
    showBadgeSuccess(1);
    mockSetBadgeText.mockClear();

    await vi.advanceTimersByTimeAsync(1999);
    expect(mockSetBadgeText).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(mockSetBadgeText).toHaveBeenCalledWith({ text: '', tabId: 1 });
  });
});
