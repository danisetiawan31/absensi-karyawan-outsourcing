import {
  getJakartaStartOfDay,
  combineJakartaDateTime,
  getJakartaSingleDayRange,
  getJakartaDateRange,
  getJakartaTodayStr,
  formatJakartaDate,
  formatJakartaTime,
} from './date.util';

describe('date.util (Jakarta +07:00)', () => {
  describe('getJakartaStartOfDay', () => {
    it('should return 00:00:00+07:00 for given date string', () => {
      const result = getJakartaStartOfDay('2026-08-01');
      expect(result.toISOString()).toBe('2026-07-31T17:00:00.000Z');
    });
  });

  describe('combineJakartaDateTime', () => {
    it('should combine YYYY-MM-DD and HH:mm into +07:00 Date', () => {
      const result = combineJakartaDateTime('2026-08-01', '08:30');
      expect(result.toISOString()).toBe('2026-08-01T01:30:00.000Z');
    });

    it('should combine YYYY-MM-DD and HH:mm:ss into +07:00 Date', () => {
      const result = combineJakartaDateTime('2026-08-01', '23:59:59');
      expect(result.toISOString()).toBe('2026-08-01T16:59:59.000Z');
    });
  });

  describe('getJakartaSingleDayRange', () => {
    it('should return [gte, lt) covering 23:59:59.999 and excluding next day 00:00:00.000', () => {
      const range = getJakartaSingleDayRange('2026-08-01');
      expect(range.gte.toISOString()).toBe('2026-07-31T17:00:00.000Z');
      expect(range.lt.toISOString()).toBe('2026-08-01T17:00:00.000Z');

      const endOfDayRecord = new Date('2026-08-01T23:59:59.999+07:00');
      expect(endOfDayRecord.getTime()).toBeGreaterThanOrEqual(
        range.gte.getTime(),
      );
      expect(endOfDayRecord.getTime()).toBeLessThan(range.lt.getTime());

      const nextDayStartRecord = new Date('2026-08-02T00:00:00.000+07:00');
      expect(nextDayStartRecord.getTime()).toBeGreaterThanOrEqual(
        range.lt.getTime(),
      );
    });
  });

  describe('getJakartaDateRange', () => {
    it('should return [gte, lt) from start of tanggalMulai to start of next day after tanggalSelesai', () => {
      const range = getJakartaDateRange('2026-08-01', '2026-08-03');
      expect(range.gte.toISOString()).toBe('2026-07-31T17:00:00.000Z');
      expect(range.lt.toISOString()).toBe('2026-08-03T17:00:00.000Z'); // 2026-08-04T00:00:00+07:00
    });
  });

  describe('getJakartaTodayStr & formatJakartaDate', () => {
    it('should accurately calculate Jakarta date when UTC is different (near midnight)', () => {
      // 17:30 UTC on July 31 is 00:30 WIB on August 1
      const utcTime = new Date('2026-07-31T17:30:00.000Z');
      expect(getJakartaTodayStr(utcTime)).toBe('2026-08-01');
      expect(formatJakartaDate(utcTime)).toBe('2026-08-01');
    });

    it('should format Date to YYYY-MM-DD in +07:00', () => {
      const date = new Date('2026-08-01T00:00:00+07:00');
      expect(formatJakartaDate(date)).toBe('2026-08-01');
    });
  });

  describe('formatJakartaTime', () => {
    it('should format Date to HH:mm in +07:00', () => {
      const date = new Date('2026-08-01T08:30:00+07:00');
      expect(formatJakartaTime(date)).toBe('08:30');
    });
  });
});
