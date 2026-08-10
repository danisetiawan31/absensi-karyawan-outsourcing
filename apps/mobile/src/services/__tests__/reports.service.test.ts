import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import {
  downloadAndOpenReport,
  getAttendanceAttempts,
  getAttendanceSummary,
} from '../reports.service';
import { useAuthStore } from '@/store/authStore';
import {
  AttendanceAttemptItem,
  AttendanceSummaryItem,
} from '@/types/reports';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

describe('ReportsService (mobile/src/services/reports.service.ts)', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(apiClient);
    useAuthStore.setState({ accessToken: 'mock-report-token' });
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('getAttendanceSummary', () => {
    it('harus memanggil GET /attendance/summary dengan query params periodeMulai & periodeSelesai', async () => {
      const mockSummary: AttendanceSummaryItem[] = [
        {
          karyawanId: 'emp-1',
          nama: 'Ahmad Karyawan',
          totalJadwal: 10,
          totalHadir: 8,
          totalTerlambat: 1,
          totalTidakHadir: 0,
          totalIzin: 1,
          totalBelum: 0,
        },
      ];

      mockAxios.onGet('/attendance/summary').reply((config) => {
        expect(config.params).toEqual({
          periodeMulai: '2026-08-01',
          periodeSelesai: '2026-08-31',
        });
        return [
          200,
          {
            success: true,
            data: mockSummary,
          },
        ];
      });

      const result = await getAttendanceSummary('2026-08-01', '2026-08-31');

      expect(result).toEqual(mockSummary);
      expect(result[0].nama).toBe('Ahmad Karyawan');
    });
  });

  describe('getAttendanceAttempts', () => {
    it('harus memanggil GET /attendance/attempts dengan karyawanId, periodeMulai & periodeSelesai', async () => {
      const mockAttempts: AttendanceAttemptItem[] = [
        {
          id: 'att-1',
          tipe: 'CHECK_IN',
          waktu: '2026-08-01T08:00:00.000Z',
          latitude: -6.2,
          longitude: 106.8,
          hasil: 'VALID',
          jadwalId: 'j-1',
        },
      ];

      mockAxios.onGet('/attendance/attempts').reply((config) => {
        expect(config.params).toEqual({
          karyawanId: 'emp-1',
          periodeMulai: '2026-08-01',
          periodeSelesai: '2026-08-31',
        });
        return [
          200,
          {
            success: true,
            data: mockAttempts,
          },
        ];
      });

      const result = await getAttendanceAttempts(
        'emp-1',
        '2026-08-01',
        '2026-08-31',
      );

      expect(result).toEqual(mockAttempts);
      expect(result[0].hasil).toBe('VALID');
    });
  });

  describe('downloadAndOpenReport', () => {
    it('harus mengunduh file via FileSystem.downloadAsync dengan URL & nama file terkonstruksi benar, lalu membuka Sharing.shareAsync', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        uri: 'file:///cache/laporan-kehadiran-2026-08-01-2026-08-31.pdf',
      });
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      await downloadAndOpenReport('pdf', '2026-08-01', '2026-08-31');

      expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
        expect.stringContaining(
          '/reports/export?format=pdf&periodeMulai=2026-08-01&periodeSelesai=2026-08-31',
        ),
        'file:///cache/laporan-kehadiran-2026-08-01-2026-08-31.pdf',
        {
          headers: { Authorization: 'Bearer mock-report-token' },
        },
      );
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file:///cache/laporan-kehadiran-2026-08-01-2026-08-31.pdf',
      );
    });

    it('harus mengunduh format xlsx dengan nama file .xlsx terkonstruksi benar', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        uri: 'file:///cache/laporan-kehadiran-2026-08-01-2026-08-31.xlsx',
      });
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      await downloadAndOpenReport('xlsx', '2026-08-01', '2026-08-31');

      expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
        expect.stringContaining(
          '/reports/export?format=xlsx&periodeMulai=2026-08-01&periodeSelesai=2026-08-31',
        ),
        'file:///cache/laporan-kehadiran-2026-08-01-2026-08-31.xlsx',
        {
          headers: { Authorization: 'Bearer mock-report-token' },
        },
      );
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file:///cache/laporan-kehadiran-2026-08-01-2026-08-31.xlsx',
      );
    });

    it('harus melempar error jika downloadAsync mengembalikan status non-200 (misal 400)', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 400,
        uri: 'file:///cache/laporan-kehadiran-2026-08-01-2026-08-31.pdf',
      });

      await expect(
        downloadAndOpenReport('pdf', '2026-08-01', '2026-08-31'),
      ).rejects.toThrow('Gagal mengunduh laporan. (HTTP 400)');

      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });
  });
});
