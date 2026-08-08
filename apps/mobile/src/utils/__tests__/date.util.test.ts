import {
  formatJakartaDate,
  formatJakartaDateRange,
  formatJakartaDateTime,
  formatJakartaTime,
  formatJakartaYmd,
} from '../date.util';

describe('Date Utility Suite (mobile/src/utils/date.util.ts)', () => {
  const sampleIso = '2026-08-08T07:30:00.000Z'; // 14:30 WIB (+07:00)

  describe('formatJakartaDateTime', () => {
    it('harus memformat ISO string ke tanggal & jam WIB yang rapi', () => {
      const result = formatJakartaDateTime(sampleIso);
      expect(result).toContain('2026');
      expect(result).toContain('14:30');
    });

    it('harus mengembalikan "-" untuk input invalid atau null', () => {
      expect(formatJakartaDateTime(null)).toBe('-');
      expect(formatJakartaDateTime('invalid')).toBe('-');
    });
  });

  describe('formatJakartaDate', () => {
    it('harus memformat Date/ISO ke tanggal WIB saja', () => {
      const result = formatJakartaDate(sampleIso);
      expect(result).toContain('2026');
    });
  });

  describe('formatJakartaDateRange', () => {
    it('harus mengembalikan tanggal tunggal jika mulai dan selesai sama hari', () => {
      const result = formatJakartaDateRange(
        '2026-08-08T00:00:00.000Z',
        '2026-08-08T12:00:00.000Z',
      );
      expect(result).not.toContain('–');
    });

    it('harus mengembalikan rentang dengan pemisah "–" jika beda hari', () => {
      const result = formatJakartaDateRange(
        '2026-08-08T00:00:00.000Z',
        '2026-08-10T00:00:00.000Z',
      );
      expect(result).toContain('–');
    });

    it('harus mengembalikan "-" jika salah satu input null/invalid', () => {
      expect(formatJakartaDateRange(null, '2026-08-10')).toBe('-');
    });
  });

  describe('formatJakartaYmd', () => {
    it('harus memformat Date ke string YYYY-MM-DD', () => {
      const date = new Date(2026, 7, 10);
      const result = formatJakartaYmd(date);
      expect(result).toBe('2026-08-10');
    });
  });

  describe('formatJakartaTime', () => {
    it('harus memformat jam ke HH:mm WIB', () => {
      const result = formatJakartaTime(sampleIso);
      expect(result).toBe('14:30');
    });
  });
});
