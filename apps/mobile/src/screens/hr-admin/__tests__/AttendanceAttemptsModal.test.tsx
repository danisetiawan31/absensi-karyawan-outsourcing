import { HasilVerifikasi } from '@/types/attendance';
import { AttendanceAttemptItem } from '@/types/reports';

import {
  getHasilVerifikasiBadgeConfig,
  isAttemptsListEmpty,
} from '../AttendanceAttemptsModal';

const mockAttemptsList: AttendanceAttemptItem[] = [
  {
    id: 'att-1',
    tipe: 'CHECK_IN',
    waktu: '2026-08-01T08:00:00.000Z',
    latitude: -6.2088,
    longitude: 106.8456,
    hasil: 'VALID',
    jadwalId: 'jadwal-1',
  },
  {
    id: 'att-2',
    tipe: 'CHECK_IN',
    waktu: '2026-08-02T08:15:00.000Z',
    latitude: -6.25,
    longitude: 106.8,
    hasil: 'GAGAL_LOKASI',
    jadwalId: 'jadwal-2',
  },
  {
    id: 'att-3',
    tipe: 'CHECK_IN',
    waktu: '2026-08-03T08:05:00.000Z',
    latitude: -6.2088,
    longitude: 106.8456,
    hasil: 'GAGAL_WAJAH',
    jadwalId: 'jadwal-3',
  },
  {
    id: 'att-4',
    tipe: 'CHECK_IN',
    waktu: '2026-08-04T08:05:00.000Z',
    latitude: -6.2088,
    longitude: 106.8456,
    hasil: 'GAGAL_LIVENESS',
    jadwalId: 'jadwal-4',
  },
  {
    id: 'att-5',
    tipe: 'CHECK_OUT',
    waktu: '2026-08-05T17:00:00.000Z',
    latitude: -6.2088,
    longitude: 106.8456,
    hasil: 'DI_LUAR_JENDELA_WAKTU',
    jadwalId: 'jadwal-5',
  },
  {
    id: 'att-6',
    tipe: 'CHECK_IN',
    waktu: '2026-08-06T08:00:00.000Z',
    latitude: -6.2088,
    longitude: 106.8456,
    hasil: 'TIDAK_HADIR',
    jadwalId: 'jadwal-6',
  },
];

describe('AttendanceAttemptsModal Pure Helpers & Presenter Tests', () => {
  describe('1. getHasilVerifikasiBadgeConfig (Semantik Token Status Absensi)', () => {
    it('memetakan status VALID ke variant success', () => {
      const config = getHasilVerifikasiBadgeConfig('VALID');
      expect(config.variant).toBe('success');
      expect(config.label).toBe('Valid');
    });

    it('memetakan status DI_LUAR_JENDELA_WAKTU ke variant warning', () => {
      const config = getHasilVerifikasiBadgeConfig('DI_LUAR_JENDELA_WAKTU');
      expect(config.variant).toBe('warning');
      expect(config.label).toBe('Di Luar Jendela Waktu');
    });

    it('memetakan status GAGAL_LOKASI, GAGAL_WAJAH, GAGAL_LIVENESS, TIDAK_HADIR ke variant destructive', () => {
      const gagalList: HasilVerifikasi[] = [
        'GAGAL_LOKASI',
        'GAGAL_WAJAH',
        'GAGAL_LIVENESS',
        'TIDAK_HADIR',
      ];

      gagalList.forEach((st) => {
        const config = getHasilVerifikasiBadgeConfig(st);
        expect(config.variant).toBe('destructive');
      });
    });
  });

  describe('2. Verifikasi Data Attempt Items', () => {
    it('memastikan percobaan absensi menyertakan koordinat latitude/longitude & tipe CHECK_IN / CHECK_OUT', () => {
      expect(mockAttemptsList).toHaveLength(6);

      const checkInItem = mockAttemptsList[0];
      expect(checkInItem.tipe).toBe('CHECK_IN');
      expect(checkInItem.latitude).toBe(-6.2088);
      expect(checkInItem.longitude).toBe(106.8456);

      const checkOutItem = mockAttemptsList[4];
      expect(checkOutItem.tipe).toBe('CHECK_OUT');
      expect(checkOutItem.hasil).toBe('DI_LUAR_JENDELA_WAKTU');
    });
  });

  describe('3. isAttemptsListEmpty (Detection Empty State)', () => {
    it('mengembalikan true jika list attempts null, undefined, atau array kosong', () => {
      expect(isAttemptsListEmpty(null)).toBe(true);
      expect(isAttemptsListEmpty(undefined)).toBe(true);
      expect(isAttemptsListEmpty([])).toBe(true);
      expect(isAttemptsListEmpty(mockAttemptsList)).toBe(false);
    });
  });
});
