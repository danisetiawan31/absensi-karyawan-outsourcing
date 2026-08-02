import { ScheduleTodayItem } from '@/types/schedule';
import {
  calculateWorkDuration,
  formatTime,
  getInitials,
  getReminderContent,
  getStatusConfig,
} from '../BerandaScreen';

describe('BerandaScreen Helpers & Logic', () => {
  describe('getInitials', () => {
    it('harus menghasilkan 2 huruf kapital untuk nama 2 kata atau lebih', () => {
      expect(getInitials('Danis Setiawan')).toBe('DS');
      expect(getInitials('Budi Pratama Jaya')).toBe('BP');
      expect(getInitials('  John   Doe  ')).toBe('JD');
    });

    it('harus menghasilkan 1 huruf kapital untuk nama 1 kata', () => {
      expect(getInitials('Danis')).toBe('D');
      expect(getInitials('budi')).toBe('B');
    });

    it('harus mengembalikan "K" jika nama kosong, undefined, atau null', () => {
      expect(getInitials('')).toBe('K');
      expect(getInitials(undefined)).toBe('K');
      expect(getInitials(null)).toBe('K');
    });
  });

  describe('calculateWorkDuration', () => {
    it('harus menghitung selisih jam kerja normal dalam jam', () => {
      const start = '2026-08-01T08:00:00.000Z';
      const end = '2026-08-01T17:00:00.000Z';
      expect(calculateWorkDuration(start, end)).toBe('9 jam kerja');
    });

    it('harus menghitung shift malam (overnight shift) dengan benar', () => {
      const start = '2026-08-01T22:00:00.000Z';
      const end = '2026-08-02T06:00:00.000Z';
      expect(calculateWorkDuration(start, end)).toBe('8 jam kerja');
    });

    it('harus mengembalikan "0 jam kerja" jika input invalid', () => {
      expect(calculateWorkDuration('', '')).toBe('0 jam kerja');
    });
  });

  describe('formatTime', () => {
    it('harus mengembalikan string jam HH:mm dari ISO date', () => {
      const isoStr = '2026-08-01T08:30:00.000Z';
      const formatted = formatTime(isoStr);
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });

    it('harus mengembalikan --:-- jika input kosong', () => {
      expect(formatTime('')).toBe('--:--');
    });
  });

  describe('getStatusConfig', () => {
    it('harus mengembalikan status BELUM_CHECKIN dengan checkInDone=false dan checkOutDone=false', () => {
      const config = getStatusConfig('BELUM_CHECKIN');
      expect(config.label).toBe('Belum Check-in');
      expect(config.checkInDone).toBe(false);
      expect(config.checkOutDone).toBe(false);
    });

    it('harus mengembalikan status SUDAH_CHECKIN dengan checkInDone=true dan checkOutDone=false', () => {
      const config = getStatusConfig('SUDAH_CHECKIN');
      expect(config.label).toBe('Sudah Check-in');
      expect(config.checkInDone).toBe(true);
      expect(config.checkOutDone).toBe(false);
    });

    it('harus mengembalikan status SELESAI dengan checkInDone=true dan checkOutDone=true', () => {
      const config = getStatusConfig('SELESAI');
      expect(config.label).toBe('Selesai Shift');
      expect(config.checkInDone).toBe(true);
      expect(config.checkOutDone).toBe(true);
    });
  });

  describe('getReminderContent (Dynamic Banner)', () => {
    const dummySchedule: ScheduleTodayItem = {
      jadwalId: 'j1',
      site: {
        nama: 'Wisma Atlet',
        alamat: 'Kemayoran',
        latitude: -6.15,
        longitude: 106.86,
        radiusToleransi: 75,
      },
      jamMulai: '2026-08-01T08:00:00.000Z',
      jamSelesai: '2026-08-01T16:00:00.000Z',
      statusKehadiran: 'BELUM_CHECKIN',
    };

    it('harus mengembalikan pesan pengingat Absensi Hadir untuk status BELUM_CHECKIN', () => {
      const content = getReminderContent(dummySchedule);
      expect(content.title).toBe('Pengingat Penting');
      expect(content.message).toContain('Absensi Hadir');
      expect(content.iconName).toBe('alarm-outline');
    });

    it('harus mengembalikan pesan pengingat Absensi Pulang untuk status SUDAH_CHECKIN', () => {
      const content = getReminderContent({
        ...dummySchedule,
        statusKehadiran: 'SUDAH_CHECKIN',
      });
      expect(content.title).toBe('Status Shift');
      expect(content.message).toContain('Absensi Pulang');
      expect(content.iconName).toBe('time-outline');
    });

    it('harus mengembalikan pesan terima kasih untuk status SELESAI', () => {
      const content = getReminderContent({
        ...dummySchedule,
        statusKehadiran: 'SELESAI',
      });
      expect(content.title).toBe('Shift Selesai');
      expect(content.message).toContain('Terima kasih');
      expect(content.iconName).toBe('checkmark-circle-outline');
    });
  });
});
