import axios from 'axios';

import {
  formatDateRange,
  getStatusIzinBadgeConfig,
  processCancelLeaveRequest,
} from '../IzinScreen';

describe('IzinScreen Pure Helpers & Presenter Logic', () => {
  describe('getStatusIzinBadgeConfig (Badge Status & Tokens)', () => {
    it('1a. status PENDING -> variant warning, label Menunggu Persetujuan', () => {
      const config = getStatusIzinBadgeConfig('PENDING');
      expect(config.variant).toBe('warning');
      expect(config.label).toBe('Menunggu Persetujuan');
      expect(config.iconName).toBe('time-outline');
    });

    it('1b. status APPROVED -> variant success, label Disetujui', () => {
      const config = getStatusIzinBadgeConfig('APPROVED');
      expect(config.variant).toBe('success');
      expect(config.label).toBe('Disetujui');
      expect(config.iconName).toBe('checkmark-circle-outline');
    });

    it('1c. status REJECTED -> variant destructive, label Ditolak', () => {
      const config = getStatusIzinBadgeConfig('REJECTED');
      expect(config.variant).toBe('destructive');
      expect(config.label).toBe('Ditolak');
      expect(config.iconName).toBe('close-circle-outline');
    });

    it('1d. status CANCELLED -> variant muted, label Dibatalkan', () => {
      const config = getStatusIzinBadgeConfig('CANCELLED');
      expect(config.variant).toBe('muted');
      expect(config.label).toBe('Dibatalkan');
      expect(config.iconName).toBe('ban-outline');
    });
  });

  describe('formatDateRange', () => {
    it('harus memformat tanggal 1 hari (start === end)', () => {
      const formatted = formatDateRange('2026-08-10', '2026-08-10');
      expect(formatted).not.toContain('–');
    });

    it('harus memformat rentang tanggal > 1 hari dengan separator', () => {
      const formatted = formatDateRange('2026-08-10', '2026-08-12');
      expect(formatted).toContain('–');
    });
  });

  describe('processCancelLeaveRequest', () => {
    it('3. Cancel sukses -> assert cancelFn dan invalidateQueriesFn terpanggil', async () => {
      const mockCancelFn = jest.fn().mockResolvedValue({ id: 'req-1', status: 'CANCELLED' });
      const mockInvalidateFn = jest.fn();

      const result = await processCancelLeaveRequest('req-1', mockCancelFn, mockInvalidateFn);

      expect(mockCancelFn).toHaveBeenCalledWith('req-1');
      expect(mockInvalidateFn).toHaveBeenCalledTimes(1);
      expect(result.type).toBe('SUCCESS');
      expect(result.message).toBe('Pengajuan izin berhasil dibatalkan.');
    });

    it('4. Cancel gagal 409 IZIN_SUDAH_DIPROSES -> assert pesan spesifik ALREADY_PROCESSED & list tetap di-refresh', async () => {
      const axiosError = new axios.AxiosError(
        'Conflict',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 409,
          statusText: 'Conflict',
          headers: {},
          config: { headers: new axios.AxiosHeaders() },
          data: {
            success: false,
            error: {
              code: 'IZIN_SUDAH_DIPROSES',
              message: 'Izin sudah diproses',
            },
          },
        },
      );

      const mockCancelFn = jest.fn().mockRejectedValue(axiosError);
      const mockInvalidateFn = jest.fn();

      const result = await processCancelLeaveRequest('req-1', mockCancelFn, mockInvalidateFn);

      expect(mockCancelFn).toHaveBeenCalledWith('req-1');
      expect(mockInvalidateFn).toHaveBeenCalledTimes(1); // List tetap di-refresh!
      expect(result.type).toBe('ALREADY_PROCESSED');
      expect(result.message).toBe(
        'Pengajuan izin ini sudah diproses oleh supervisor. Status telah diperbarui.',
      );
    });

    it('5. Error generik -> assert type ERROR', async () => {
      const mockCancelFn = jest.fn().mockRejectedValue(new Error('Network error'));
      const mockInvalidateFn = jest.fn();

      const result = await processCancelLeaveRequest('req-1', mockCancelFn, mockInvalidateFn);

      expect(mockInvalidateFn).toHaveBeenCalledTimes(1);
      expect(result.type).toBe('ERROR');
      expect(result.message).toBe('Gagal membatalkan pengajuan izin. Silakan coba lagi.');
    });
  });
});
