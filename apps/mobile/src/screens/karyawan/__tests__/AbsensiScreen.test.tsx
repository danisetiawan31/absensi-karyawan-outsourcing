import {
  getAbsensiActionConfig,
  formatTime,
  handleNavigationToCamera,
} from '../AbsensiScreen';

describe('AbsensiScreen Pure Helpers & Handler Logic', () => {
  describe('formatTime', () => {
    it('harus memformat ISO date string ke HH:mm', () => {
      const iso = '2026-08-07T08:30:00.000Z';
      const formatted = formatTime(iso);
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });

    it('harus mengembalikan --:-- jika input undefined/kosong', () => {
      expect(formatTime('')).toBe('--:--');
    });
  });

  describe('getAbsensiActionConfig', () => {
    it('1. statusKehadiran BELUM_CHECKIN -> tombol Check-in ter-render, tipe CHECK_IN', () => {
      const config = getAbsensiActionConfig('BELUM_CHECKIN');
      expect(config.showButton).toBe(true);
      expect(config.buttonText).toBe('Check-in Sekarang');
      expect(config.tipe).toBe('CHECK_IN');
      expect(config.badgeLabel).toBe('Belum Check-in');
      expect(config.variant).toBe('warning');
    });

    it('2. statusKehadiran SUDAH_CHECKIN -> tombol Check-out ter-render, tipe CHECK_OUT', () => {
      const config = getAbsensiActionConfig('SUDAH_CHECKIN');
      expect(config.showButton).toBe(true);
      expect(config.buttonText).toBe('Check-out Sekarang');
      expect(config.tipe).toBe('CHECK_OUT');
      expect(config.badgeLabel).toBe('Sudah Check-in (Aktif)');
      expect(config.variant).toBe('info');
    });

    it('3. statusKehadiran SELESAI -> tidak ada tombol aksi ter-render', () => {
      const config = getAbsensiActionConfig('SELESAI');
      expect(config.showButton).toBe(false);
      expect(config.buttonText).toBe('');
      expect(config.tipe).toBeNull();
      expect(config.badgeLabel).toBe('Presensi Selesai');
      expect(config.variant).toBe('success');
    });
  });

  describe('handleNavigationToCamera', () => {
    it('4. Navigasi ke attendance-camera dengan param jadwalId dan tipe yang benar (CHECK_IN)', () => {
      const mockRouterPush = jest.fn();
      handleNavigationToCamera('jadwal-123', 'CHECK_IN', mockRouterPush);

      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: '/(karyawan)/attendance-camera',
        params: {
          jadwalId: 'jadwal-123',
          tipe: 'CHECK_IN',
        },
      });
    });

    it('5. Navigasi ke attendance-camera dengan param jadwalId dan tipe yang benar (CHECK_OUT)', () => {
      const mockRouterPush = jest.fn();
      handleNavigationToCamera('jadwal-456', 'CHECK_OUT', mockRouterPush);

      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: '/(karyawan)/attendance-camera',
        params: {
          jadwalId: 'jadwal-456',
          tipe: 'CHECK_OUT',
        },
      });
    });
  });
});
