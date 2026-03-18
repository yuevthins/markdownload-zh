import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateId, formatDate, formatDateTime } from './id';

// getDateParts is not exported, but we can test its output through generateId.
// Let's create a helper to extract the date part from the ID.
const extractDateFromId = (id: string) => id.substring(0, 8);

describe('id generation and formatting', () => {
  afterEach(() => {
    // Restore any mocks after each test
    vi.restoreAllMocks();
  });

  describe('generateId', () => {
    it('should generate an ID with the current date if no date is provided', () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const expectedDatePart = `${year}${month}${day}`;

      const id = generateId();
      expect(id).toMatch(/^\d{8}-[a-z0-9]{4}$/);
      expect(extractDateFromId(id)).toBe(expectedDatePart);
    });

    it('should generate an ID for a specific date', () => {
      const date = new Date(2023, 5, 20); // June 20, 2023
      const id = generateId(date);
      expect(extractDateFromId(id)).toBe('20230620');
    });

    it('should handle boundary date: beginning of the year', () => {
      const date = new Date(2024, 0, 1); // Jan 1, 2024
      const id = generateId(date);
      expect(extractDateFromId(id)).toBe('20240101');
    });

    it('should handle boundary date: end of the year', () => {
      const date = new Date(2024, 11, 31); // Dec 31, 2024
      const id = generateId(date);
      expect(extractDateFromId(id)).toBe('20241231');
    });

    it('should handle leap year February 29th', () => {
      const date = new Date(2024, 1, 29); // Feb 29, 2024 is a leap year
      const id = generateId(date);
      expect(extractDateFromId(id)).toBe('20240229');
    });

    it('should handle non-leap year February 28th', () => {
      const date = new Date(2023, 1, 28); // Feb 28, 2023 is not a leap year
      const id = generateId(date);
      expect(extractDateFromId(id)).toBe('20230228');
    });
    
    // Note on timezones: new Date('...') creates a date in the local timezone of the test runner.
    // The functions use getFullYear, getMonth, getDate which are also based on local time.
    // This test ensures that a UTC timestamp is correctly converted to the local date.
    it('should handle timezone boundaries correctly', () => {
      // This UTC time might be Jan 1st or Dec 31st depending on the local timezone.
      // For example, in PST (UTC-8), this is Dec 31st 4pm. In Tokyo (UTC+9), it's Jan 1st 9am.
      // We test the *local* date parts.
      const date = new Date('2024-01-01T00:00:00.000Z');
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const id = generateId(date);
      expect(extractDateFromId(id)).toBe(`${year}${month}${day}`);
    });

    it('should generate a valid random part', () => {
      const id = generateId();
      const randomPart = id.split('-')[1];
      expect(randomPart).toHaveLength(4);
      expect(randomPart).toMatch(/^[a-z0-9]{4}$/);
    });

    it('should use Math.random to generate the random part', () => {
      // Mock Math.random to return a predictable value
      const mockRandomValue = 0.123456789;
      vi.spyOn(global.Math, 'random').mockReturnValue(mockRandomValue);

      // The expected random part from the mock value
      const expectedRandomPart = mockRandomValue.toString(36).substring(2, 6); // '4f2u'

      const id = generateId();
      expect(id.split('-')[1]).toBe(expectedRandomPart);
      expect(global.Math.random).toHaveBeenCalledOnce();
    });

    // Note: 100 calls with 4-char base36 random part (36^4 = 1,679,616 possibilities)
    // Expected collision probability < 0.3% for 100 samples (birthday paradox)
    it('should generate unique IDs on multiple calls', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('formatDate', () => {
    it('should format current date as YYYY-MM-DD', () => {
      const result = formatDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should format a specific date as YYYY-MM-DD', () => {
      const date = new Date(2023, 4, 15); // May 15, 2023
      const result = formatDate(date);
      expect(result).toBe('2023-05-15');
    });
  });

  describe('formatDateTime', () => {
    it('should format current datetime with time', () => {
      const result = formatDateTime();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should format a specific datetime with time', () => {
      const date = new Date(2023, 4, 15, 8, 5, 30); // May 15, 2023, 08:05:30
      const result = formatDateTime(date);
      expect(result).toBe('2023-05-15 08:05:30');
    });
  });
});