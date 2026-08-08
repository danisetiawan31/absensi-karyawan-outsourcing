import { NotificationItem } from '@/types/notification';
import {
  formatNotificationDate,
  getNotificationTypeConfig,
  processMarkNotificationAsRead,
} from '../NotifikasiScreen';

describe('NotifikasiScreen Unit Tests', () => {
  const sampleNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      tipe: 'REMINDER_CHECKIN',
      pesan: 'Pengingat presensi: Waktunya check-in',
      createdAt: '2026-08-08T07:00:00.000Z',
      dibaca: false,
    },
    {
      id: 'notif-2',
      tipe: 'PERUBAHAN_JADWAL',
      pesan: 'Jadwal shift Anda telah diubah oleh supervisor',
      createdAt: '2026-08-07T10:30:00.000Z',
      dibaca: true,
    },
    {
      id: 'notif-3',
      tipe: 'ALERT_SUPERVISOR',
      pesan: 'Alert supervisor',
      createdAt: '2026-08-06T15:00:00.000Z',
      dibaca: false,
    },
    {
      id: 'notif-4',
      tipe: 'PENGAJUAN_IZIN_ORPHANED',
      pesan: 'Pengajuan izin orphaned',
      createdAt: '2026-08-05T09:00:00.000Z',
      dibaca: true,
    },
  ];

  describe('1. Notification Type Mapping & Fallbacks (4 Tipe)', () => {
    it('REMINDER_CHECKIN -> variant warning, icon time-outline', () => {
      const config = getNotificationTypeConfig('REMINDER_CHECKIN');
      expect(config.variant).toBe('warning');
      expect(config.iconName).toBe('time-outline');
      expect(config.typeLabel).toBe('Pengingat Presensi');
    });

    it('PERUBAHAN_JADWAL -> variant info, icon calendar-outline', () => {
      const config = getNotificationTypeConfig('PERUBAHAN_JADWAL');
      expect(config.variant).toBe('info');
      expect(config.iconName).toBe('calendar-outline');
      expect(config.typeLabel).toBe('Perubahan Jadwal');
    });

    it('ALERT_SUPERVISOR & PENGAJUAN_IZIN_ORPHANED -> fallback variant muted, icon notifications-outline tanpa crash', () => {
      const configAlert = getNotificationTypeConfig('ALERT_SUPERVISOR');
      expect(configAlert.variant).toBe('muted');
      expect(configAlert.typeLabel).toBe('Pemberitahuan');

      const configOrphan = getNotificationTypeConfig('PENGAJUAN_IZIN_ORPHANED');
      expect(configOrphan.variant).toBe('muted');

      const configUnknown = getNotificationTypeConfig('UNKNOWN_TYPE_XYZ');
      expect(configUnknown.variant).toBe('muted');
    });
  });

  describe('2. Date Formatting Helper', () => {
    it('harus memformat tanggal ISO menjadi string tanggal & waktu lokal yang rapi', () => {
      const formatted = formatNotificationDate('2026-08-08T07:00:00.000Z');
      expect(formatted).not.toBe('-');
      expect(formatted).toContain('2026');
    });

    it('harus mengembalikan "-" jika string tanggal tidak valid', () => {
      expect(formatNotificationDate('')).toBe('-');
      expect(formatNotificationDate('invalid-date')).toBe('-');
    });
  });

  describe('3. Visual Read vs Unread Logic & Mark as Read Process', () => {
    it('Tap item unread -> memanggil markFn dan memperbarui dibaca menjadi true', async () => {
      const markFn = jest.fn().mockResolvedValue({ success: true });

      const result = await processMarkNotificationAsRead(
        'notif-1',
        sampleNotifications,
        markFn,
      );

      expect(result.success).toBe(true);
      expect(markFn).toHaveBeenCalledWith('notif-1');
      const updatedItem = result.updatedNotifications.find((n) => n.id === 'notif-1');
      expect(updatedItem?.dibaca).toBe(true);
    });

    it('Tap item yang SUDAH dibaca -> skip markFn (idempotent)', async () => {
      const markFn = jest.fn();

      const result = await processMarkNotificationAsRead(
        'notif-2',
        sampleNotifications,
        markFn,
      );

      expect(result.success).toBe(true);
      expect(markFn).not.toHaveBeenCalled();
    });

    it('Mark-as-read gagal -> mengembalikan success: false, pesan error, DAN revert item tetap unread', async () => {
      const markFn = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await processMarkNotificationAsRead(
        'notif-1',
        sampleNotifications,
        markFn,
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe(
        'Gagal memperbarui status notifikasi. Silakan coba lagi.',
      );
      const targetItem = result.updatedNotifications.find((n) => n.id === 'notif-1');
      expect(targetItem?.dibaca).toBe(false);
    });

    it('Tap ganda sinkron pada item unread yang sama -> markFn HANYA dipanggil 1x', async () => {
      const pendingSet = new Set<string>();
      let resolveMark: (val: any) => void;
      const slowMarkPromise = new Promise((res) => {
        resolveMark = res;
      });

      const markFn = jest.fn().mockImplementation(() => slowMarkPromise);

      const call1 = processMarkNotificationAsRead(
        'notif-1',
        sampleNotifications,
        markFn,
        pendingSet,
      );

      const call2 = processMarkNotificationAsRead(
        'notif-1',
        sampleNotifications,
        markFn,
        pendingSet,
      );

      resolveMark!({ success: true });
      await Promise.all([call1, call2]);

      expect(markFn).toHaveBeenCalledTimes(1);
    });
  });
});
