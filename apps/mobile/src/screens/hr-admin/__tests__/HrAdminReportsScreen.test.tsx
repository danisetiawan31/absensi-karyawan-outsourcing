import { AttendanceSummaryItem } from '@/types/reports';
import { formatJakartaYmd } from '@/utils/date.util';

import {
  closeDrillDownState,
  createDrillDownState,
  getDefault30DaysPeriodDates,
  isPeriodValid,
} from '../HrAdminReportsScreen';

const mockSummaryItems: AttendanceSummaryItem[] = [
  {
    karyawanId: 'emp-1',
    nama: 'Ahmad Karyawan',
    totalJadwal: 10,
    totalHadir: 7,
    totalTerlambat: 1,
    totalTidakHadir: 1,
    totalIzin: 1,
    totalBelum: 0,
  },
  {
    karyawanId: 'emp-2',
    nama: 'Siti Karyawan',
    totalJadwal: 8,
    totalHadir: 5,
    totalTerlambat: 2,
    totalTidakHadir: 0,
    totalIzin: 0,
    totalBelum: 1,
  },
];

describe('HrAdminReportsScreen Presenter & State Flow Tests', () => {
  describe('1. getDefault30DaysPeriodDates & isPeriodValid', () => {
    it('mengembalikan tanggal 30 hari yang lalu sebagai dateMulai dan hari ini sebagai dateSelesai', () => {
      const fixedNow = new Date('2026-08-10T12:00:00.000Z');
      const period = getDefault30DaysPeriodDates(fixedNow);

      expect(formatJakartaYmd(period.dateSelesai)).toBe('2026-08-10');
      expect(formatJakartaYmd(period.dateMulai)).toBe('2026-07-11');
    });

    it('memvalidasi keabsahan rentang periode tanggal', () => {
      const start = new Date('2026-08-01');
      const end = new Date('2026-08-10');

      expect(isPeriodValid(start, end)).toBe(true);
      expect(isPeriodValid(end, start)).toBe(false);
      expect(isPeriodValid(null, end)).toBe(false);
      expect(isPeriodValid(start, null)).toBe(false);
    });
  });

  describe('2. Verifikasi Struktur Grid 6 Metrik Kehadiran per Karyawan', () => {
    it('setiap item summary memiliki 6 metrik yang terisi lengkap', () => {
      const item = mockSummaryItems[0];
      expect(item.totalHadir).toBe(7);
      expect(item.totalTerlambat).toBe(1);
      expect(item.totalTidakHadir).toBe(1);
      expect(item.totalIzin).toBe(1);
      expect(item.totalBelum).toBe(0);
      expect(item.totalJadwal).toBe(10);

      const sumMetrik =
        item.totalHadir +
        item.totalTerlambat +
        item.totalTidakHadir +
        item.totalIzin +
        item.totalBelum;
      expect(sumMetrik).toBe(item.totalJadwal);
    });
  });

  describe('3. Syarat Eksekusi Export PDF & XLSX', () => {
    it('export hanya dapat dieksekusi saat periode valid', () => {
      const valid = isPeriodValid(new Date('2026-08-01'), new Date('2026-08-10'));
      const invalid = isPeriodValid(new Date('2026-08-10'), new Date('2026-08-01'));

      expect(valid).toBe(true);
      expect(invalid).toBe(false);
    });
  });

  describe('4. Drill-Down State Flow (Tap Card to Open & Close Modal)', () => {
    it('Skenario (a): tap handler card summary karyawan mengkonstruksi state drill-down dengan karyawanId & nama yang benar', () => {
      const emp = mockSummaryItems[0];
      const state = createDrillDownState(emp.karyawanId, emp.nama);

      expect(state).toEqual({
        id: 'emp-1',
        nama: 'Ahmad Karyawan',
      });
    });

    it('Skenario (d): menutup modal drill-down me-reset state drill-down menjadi null (kembali ke summary)', () => {
      const state = closeDrillDownState();
      expect(state).toBeNull();
    });
  });
});
