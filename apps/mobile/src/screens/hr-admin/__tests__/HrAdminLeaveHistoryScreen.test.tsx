import { Employee } from '@/types/employee';
import { LeaveRequestHistoryItem } from '@/types/leave-request';
import { getStatusIzinBadgeConfig } from '@/utils/status-izin-badge.util';

import { formatJakartaYmd } from '@/utils/date.util';

import {
  filterEmployeesForPicker,
  getDefault30DaysPeriodDates,
} from '../HrAdminLeaveHistoryScreen';

const mockHistoryItems: LeaveRequestHistoryItem[] = [
  {
    id: 'req-hist-1',
    karyawanId: 'emp-1',
    karyawan: { id: 'emp-1', nama: 'Ahmad Karyawan' },
    tanggalMulai: '2026-08-01T00:00:00.000Z',
    tanggalSelesai: '2026-08-02T00:00:00.000Z',
    jenis: 'SAKIT',
    alasan: 'Flu berat',
    dokumenPendukungUrl: 'storage/surat.pdf',
    status: 'APPROVED',
    catatanSupervisor: 'Istirahat ya',
    approvedById: 'spv-1',
    approvedBy: { id: 'spv-1', nama: 'Budi Supervisor' },
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'req-hist-2',
    karyawanId: 'emp-2',
    karyawan: { id: 'emp-2', nama: 'Siti Karyawan' },
    tanggalMulai: '2026-08-05T00:00:00.000Z',
    tanggalSelesai: '2026-08-05T00:00:00.000Z',
    jenis: 'IZIN',
    alasan: 'Urusan keluarga',
    dokumenPendukungUrl: null,
    status: 'PENDING',
    catatanSupervisor: null,
    approvedById: null,
    approvedBy: null,
    createdAt: '2026-08-04T10:00:00.000Z',
  },
  {
    id: 'req-hist-3',
    karyawanId: 'emp-1',
    karyawan: { id: 'emp-1', nama: 'Ahmad Karyawan' },
    tanggalMulai: '2026-07-20T00:00:00.000Z',
    tanggalSelesai: '2026-07-20T00:00:00.000Z',
    jenis: 'CUTI',
    alasan: 'Keperluan mendesak',
    dokumenPendukungUrl: null,
    status: 'REJECTED',
    catatanSupervisor: 'Jadwal padat',
    approvedById: 'spv-1',
    approvedBy: { id: 'spv-1', nama: 'Budi Supervisor' },
    createdAt: '2026-07-19T08:00:00.000Z',
  },
  {
    id: 'req-hist-4',
    karyawanId: 'emp-3',
    karyawan: { id: 'emp-3', nama: 'Dedi Karyawan' },
    tanggalMulai: '2026-07-15T00:00:00.000Z',
    tanggalSelesai: '2026-07-15T00:00:00.000Z',
    jenis: 'IZIN',
    alasan: 'Batal ajukan',
    dokumenPendukungUrl: null,
    status: 'CANCELLED',
    catatanSupervisor: null,
    approvedById: null,
    approvedBy: null,
    createdAt: '2026-07-14T08:00:00.000Z',
  },
];

const mockEmployeesList: Employee[] = [
  {
    id: 'emp-1',
    nama: 'Ahmad Karyawan',
    email: 'ahmad@test.com',
    role: 'KARYAWAN',
    statusAktif: true,
    wajahTerdaftar: true,
  },
  {
    id: 'emp-2',
    nama: 'Siti Karyawan',
    email: 'siti@test.com',
    role: 'KARYAWAN',
    statusAktif: true,
    wajahTerdaftar: false,
  },
];

describe('HrAdminLeaveHistoryScreen Pure Helpers & Presenter Tests', () => {
  describe('1. getDefault30DaysPeriodDates (Default Periode 30 Hari)', () => {
    it('mengembalikan tanggal 30 hari yang lalu sebagai dateMulai dan hari ini sebagai dateSelesai', () => {
      const fixedNow = new Date('2026-08-10T12:00:00.000Z');
      const period = getDefault30DaysPeriodDates(fixedNow);

      expect(formatJakartaYmd(period.dateSelesai)).toBe('2026-08-10');
      expect(formatJakartaYmd(period.dateMulai)).toBe('2026-07-11');
    });
  });

  describe('2. filterEmployeesForPicker (Filtering Karyawan Picker)', () => {
    it('searchQuery kosong -> mengembalikan seluruh karyawan', () => {
      const res = filterEmployeesForPicker(mockEmployeesList, '');
      expect(res).toHaveLength(2);
    });

    it('searchQuery diisi -> memfilter karyawan berdasarkan nama/email secara case-insensitive', () => {
      const matchNama = filterEmployeesForPicker(mockEmployeesList, 'Ahmad');
      expect(matchNama).toHaveLength(1);
      expect(matchNama[0].id).toBe('emp-1');

      const matchEmail = filterEmployeesForPicker(mockEmployeesList, 'siti@');
      expect(matchEmail).toHaveLength(1);
      expect(matchEmail[0].id).toBe('emp-2');

      const noMatch = filterEmployeesForPicker(mockEmployeesList, 'TidakAda');
      expect(noMatch).toHaveLength(0);
    });
  });

  describe('3. getStatusIzinBadgeConfig Reuse Integration', () => {
    it('memastikan badge config konsisten menggunakan getStatusIzinBadgeConfig shared untuk 4 status', () => {
      const statuses: LeaveRequestHistoryItem['status'][] = [
        'PENDING',
        'APPROVED',
        'REJECTED',
        'CANCELLED',
      ];

      const configs = statuses.map((st) => getStatusIzinBadgeConfig(st));

      expect(configs[0]).toEqual({
        variant: 'warning',
        label: 'Menunggu Persetujuan',
        iconName: 'time-outline',
      });
      expect(configs[1]).toEqual({
        variant: 'success',
        label: 'Disetujui',
        iconName: 'checkmark-circle-outline',
      });
      expect(configs[2]).toEqual({
        variant: 'destructive',
        label: 'Ditolak',
        iconName: 'close-circle-outline',
      });
      expect(configs[3]).toEqual({
        variant: 'muted',
        label: 'Dibatalkan',
        iconName: 'ban-outline',
      });
    });
  });

  describe('4. Kondisi Rendering Tombol Lihat Dokumen', () => {
    it('hanya item dengan dokumenPendukungUrl !== null yang memenuhi syarat render tombol dokumen', () => {
      const withDoc = mockHistoryItems.filter((i) => i.dokumenPendukungUrl !== null);
      const withoutDoc = mockHistoryItems.filter((i) => i.dokumenPendukungUrl === null);

      expect(withDoc).toHaveLength(1);
      expect(withDoc[0].id).toBe('req-hist-1');

      expect(withoutDoc).toHaveLength(3);
    });
  });
});
