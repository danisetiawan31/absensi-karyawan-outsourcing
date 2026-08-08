import MockAdapter from 'axios-mock-adapter';

import { NotificationItem } from '@/types/notification';

import apiClient from '../apiClient';
import { getNotifications, markAsRead } from '../notifications.service';

describe('NotificationsService (mobile/src/services/notifications.service.ts)', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('getNotifications', () => {
    it('harus memanggil GET /notifications dan mengembalikan daftar notifikasi yang ter-parse benar', async () => {
      const mockNotifications: NotificationItem[] = [
        {
          id: 'notif-1',
          tipe: 'REMINDER_CHECKIN',
          pesan: 'Pengingat: Waktunya check-in shift Pagi',
          createdAt: '2026-08-08T07:00:00.000Z',
          dibaca: false,
        },
        {
          id: 'notif-2',
          tipe: 'PERUBAHAN_JADWAL',
          pesan: 'Jadwal shift Anda telah diperbarui',
          createdAt: '2026-08-07T12:00:00.000Z',
          dibaca: true,
        },
      ];

      mockAxios.onGet('/notifications').reply(200, {
        success: true,
        data: mockNotifications,
      });

      const result = await getNotifications();

      expect(result).toEqual(mockNotifications);
      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe('/notifications');
    });
  });

  describe('markAsRead', () => {
    it('harus memanggil PATCH /notifications/:id/read dengan ID yang benar dan mengembalikan success: true', async () => {
      const notifId = 'notif-1';
      mockAxios.onPatch(`/notifications/${notifId}/read`).reply(200, {
        success: true,
        data: { success: true },
      });

      const result = await markAsRead(notifId);

      expect(result).toEqual({ success: true });
      expect(mockAxios.history.patch.length).toBe(1);
      expect(mockAxios.history.patch[0].url).toBe('/notifications/notif-1/read');
    });
  });
});
