import MockAdapter from 'axios-mock-adapter';

import {
  CreateSchedulePayload,
  ScheduleItem,
  UpdateSchedulePayload,
} from '@/types/schedule';

import apiClient from '../apiClient';
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  updateSchedule,
} from '../schedules.service';

describe('SchedulesService (mobile/src/services/schedules.service.ts)', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('getSchedules', () => {
    it('harus memanggil GET /schedules dengan tanggal dan optional siteId query param', async () => {
      const mockItems: ScheduleItem[] = [
        {
          id: 'schedule-uuid-1',
          tanggal: '2026-08-10',
          jamMulai: '2026-08-10T08:00:00.000Z',
          jamSelesai: '2026-08-10T16:00:00.000Z',
          karyawan: { id: 'user-1', nama: 'Budi Santoso' },
          site: { id: 'site-1', nama: 'Wisma Atlet' },
        },
      ];

      mockAxios
        .onGet('/schedules', { params: { tanggal: '2026-08-10', siteId: 'site-1' } })
        .reply(200, {
          success: true,
          data: mockItems,
        });

      const result = await getSchedules('2026-08-10', 'site-1');

      expect(result).toEqual(mockItems);
      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe('/schedules');
      expect(mockAxios.history.get[0].params).toEqual({
        tanggal: '2026-08-10',
        siteId: 'site-1',
      });
    });
  });

  describe('createSchedule', () => {
    it('harus memanggil POST /schedules dengan payload jadwal baru', async () => {
      const payload: CreateSchedulePayload = {
        karyawanId: 'user-1',
        siteId: 'site-1',
        tanggal: '2026-08-10',
        jamMulai: '08:00',
        jamSelesai: '16:00',
      };

      const mockResponse: ScheduleItem = {
        id: 'new-schedule-uuid',
        tanggal: '2026-08-10',
        jamMulai: '2026-08-10T08:00:00.000Z',
        jamSelesai: '2026-08-10T16:00:00.000Z',
        karyawan: { id: 'user-1', nama: 'Budi Santoso' },
        site: { id: 'site-1', nama: 'Wisma Atlet' },
      };

      mockAxios.onPost('/schedules', payload).reply(201, {
        success: true,
        data: mockResponse,
      });

      const result = await createSchedule(payload);

      expect(result).toEqual(mockResponse);
      expect(mockAxios.history.post.length).toBe(1);
      expect(JSON.parse(mockAxios.history.post[0].data)).toEqual(payload);
    });
  });

  describe('updateSchedule', () => {
    it('harus memanggil PATCH /schedules/:id dengan payload perubahan partial', async () => {
      const payload: UpdateSchedulePayload = {
        jamMulai: '09:00',
        jamSelesai: '17:00',
      };

      const mockResponse: ScheduleItem = {
        id: 'schedule-uuid-1',
        tanggal: '2026-08-10',
        jamMulai: '2026-08-10T09:00:00.000Z',
        jamSelesai: '2026-08-10T17:00:00.000Z',
        karyawan: { id: 'user-1', nama: 'Budi Santoso' },
        site: { id: 'site-1', nama: 'Wisma Atlet' },
      };

      mockAxios.onPatch('/schedules/schedule-uuid-1', payload).reply(200, {
        success: true,
        data: mockResponse,
      });

      const result = await updateSchedule('schedule-uuid-1', payload);

      expect(result).toEqual(mockResponse);
      expect(mockAxios.history.patch.length).toBe(1);
    });
  });

  describe('deleteSchedule', () => {
    it('harus memanggil DELETE /schedules/:id dan mengembalikan status sukses', async () => {
      mockAxios.onDelete('/schedules/schedule-uuid-1').reply(200, {
        success: true,
        data: { success: true },
      });

      const result = await deleteSchedule('schedule-uuid-1');

      expect(result).toEqual({ success: true });
      expect(mockAxios.history.delete.length).toBe(1);
      expect(mockAxios.history.delete[0].url).toBe('/schedules/schedule-uuid-1');
    });
  });
});
