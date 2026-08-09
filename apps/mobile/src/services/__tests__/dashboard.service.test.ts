import MockAdapter from 'axios-mock-adapter';

import {
  DashboardAttendanceItem,
  UnfilledShiftItem,
} from '@/types/dashboard';

import apiClient from '../apiClient';
import {
  getAttendanceDashboard,
  getUnfilledShifts,
} from '../dashboard.service';

describe('DashboardService (mobile/src/services/dashboard.service.ts)', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('getAttendanceDashboard', () => {
    it('harus memanggil GET /dashboard/attendance dengan query param tanggal dan mengembalikan data yang ter-parse benar', async () => {
      const mockItems: DashboardAttendanceItem[] = [
        {
          karyawan: 'Budi Santoso',
          site: 'Wisma Atlet',
          status: 'HADIR',
          waktuCheckIn: '2026-08-09T07:55:00.000Z',
        },
        {
          karyawan: 'Ahmad Supardi',
          site: 'Wisma Atlet',
          status: 'BELUM',
          waktuCheckIn: null,
        },
      ];

      mockAxios
        .onGet('/dashboard/attendance', { params: { tanggal: '2026-08-09' } })
        .reply(200, {
          success: true,
          data: mockItems,
        });

      const result = await getAttendanceDashboard('2026-08-09');

      expect(result).toEqual(mockItems);
      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe('/dashboard/attendance');
      expect(mockAxios.history.get[0].params).toEqual({ tanggal: '2026-08-09' });
    });
  });

  describe('getUnfilledShifts', () => {
    it('harus memanggil GET /dashboard/unfilled-shifts dengan query param tanggal dan mengembalikan list shift kosong', async () => {
      const mockUnfilled: UnfilledShiftItem[] = [
        {
          jadwalId: 'jadwal-uuid-1',
          karyawan: 'Ahmad Supardi',
          site: 'Wisma Atlet',
          jamMulai: '2026-08-09T08:00:00.000Z',
          jamSelesai: '2026-08-09T16:00:00.000Z',
          menitTerlambat: 25,
        },
      ];

      mockAxios
        .onGet('/dashboard/unfilled-shifts', {
          params: { tanggal: '2026-08-09' },
        })
        .reply(200, {
          success: true,
          data: mockUnfilled,
        });

      const result = await getUnfilledShifts('2026-08-09');

      expect(result).toEqual(mockUnfilled);
      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe('/dashboard/unfilled-shifts');
      expect(mockAxios.history.get[0].params).toEqual({ tanggal: '2026-08-09' });
    });
  });
});
