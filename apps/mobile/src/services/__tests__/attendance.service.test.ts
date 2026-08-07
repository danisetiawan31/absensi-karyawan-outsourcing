import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import {
  checkIn,
  checkOut,
  createAttendanceFormData,
} from '../attendance.service';
import {
  CheckInResponse,
  CheckOutResponse,
  CheckInSuccessResult,
  CheckOutSuccessResult,
  ControlledFailureResult,
} from '@/types/attendance';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

describe('AttendanceService (mobile/src/services/attendance.service.ts)', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('createAttendanceFormData', () => {
    it('harus membuat FormData dengan string photoUri dengan benar', () => {
      const formData = createAttendanceFormData(
        'jadwal-123',
        -6.2088,
        106.8456,
        'file:///storage/photo.png',
      );

      // Verifikasi FormData terisi
      expect(formData).toBeDefined();
    });

    it('harus membuat FormData dengan PhotoFile object dengan benar', () => {
      const formData = createAttendanceFormData(
        'jadwal-123',
        -6.2088,
        106.8456,
        { uri: 'file:///storage/photo.jpg', name: 'custom.jpg', type: 'image/jpeg' },
      );

      expect(formData).toBeDefined();
    });
  });

  describe('checkIn', () => {
    it('harus mengirim request multipart/form-data dengan timeout 60000ms dan mem-parse response VALID', async () => {
      const mockSuccessData: CheckInSuccessResult = {
        logId: 'log-checkin-1',
        waktuCheckIn: '2026-08-07T08:00:00.000Z',
        hasilVerifikasi: 'VALID',
      };

      mockAxios.onPost('/attendance/check-in').reply((config) => {
        // Assert header dan timeout config
        expect(config.timeout).toBe(60000);
        expect(config.headers?.['Content-Type']).toBe('multipart/form-data');
        expect(config.data).toBeInstanceOf(FormData);

        return [
          200,
          {
            success: true,
            data: mockSuccessData,
            meta: { timestamp: new Date().toISOString(), requestId: 'req-1' },
          },
        ];
      });

      const result = await checkIn(
        'jadwal-123',
        -6.2088,
        106.8456,
        'file:///path/to/photo.jpg',
      );

      expect(result.hasilVerifikasi).toBe('VALID');
      if (result.hasilVerifikasi === 'VALID') {
        expect(result.logId).toBe('log-checkin-1');
        expect(result.waktuCheckIn).toBe('2026-08-07T08:00:00.000Z');
      }
    });

    it('harus mem-parse response gagal-terkontrol (GAGAL_LOKASI) dengan benar tanpa crash', async () => {
      const mockFailureData: ControlledFailureResult = {
        hasilVerifikasi: 'GAGAL_LOKASI',
        pesan: 'Anda berada di luar radius lokasi',
      };

      mockAxios.onPost('/attendance/check-in').reply(200, {
        success: true,
        data: mockFailureData,
        meta: { timestamp: new Date().toISOString(), requestId: 'req-2' },
      });

      const result: CheckInResponse = await checkIn(
        'jadwal-123',
        -6.2088,
        106.8456,
        'file:///path/to/photo.jpg',
      );

      expect(result.hasilVerifikasi).toBe('GAGAL_LOKASI');
      if (result.hasilVerifikasi !== 'VALID') {
        expect(result.pesan).toBe('Anda berada di luar radius lokasi');
      }
    });
  });

  describe('checkOut', () => {
    it('harus mengirim request multipart/form-data dengan timeout 60000ms dan mem-parse response VALID', async () => {
      const mockSuccessData: CheckOutSuccessResult = {
        logId: 'log-checkout-1',
        waktuCheckOut: '2026-08-07T17:00:00.000Z',
        hasilVerifikasi: 'VALID',
      };

      mockAxios.onPost('/attendance/check-out').reply((config) => {
        expect(config.timeout).toBe(60000);
        expect(config.headers?.['Content-Type']).toBe('multipart/form-data');
        expect(config.data).toBeInstanceOf(FormData);

        return [
          200,
          {
            success: true,
            data: mockSuccessData,
            meta: { timestamp: new Date().toISOString(), requestId: 'req-3' },
          },
        ];
      });

      const result = await checkOut(
        'jadwal-123',
        -6.2088,
        106.8456,
        'file:///path/to/photo.jpg',
      );

      expect(result.hasilVerifikasi).toBe('VALID');
      if (result.hasilVerifikasi === 'VALID') {
        expect(result.logId).toBe('log-checkout-1');
        expect(result.waktuCheckOut).toBe('2026-08-07T17:00:00.000Z');
      }
    });

    it('harus mem-parse response gagal-terkontrol (DI_LUAR_JENDELA_WAKTU) dengan benar tanpa crash', async () => {
      const mockFailureData: ControlledFailureResult = {
        hasilVerifikasi: 'DI_LUAR_JENDELA_WAKTU',
        pesan: 'Waktu check-out di luar batas yang diizinkan',
      };

      mockAxios.onPost('/attendance/check-out').reply(200, {
        success: true,
        data: mockFailureData,
        meta: { timestamp: new Date().toISOString(), requestId: 'req-4' },
      });

      const result: CheckOutResponse = await checkOut(
        'jadwal-123',
        -6.2088,
        106.8456,
        'file:///path/to/photo.jpg',
      );

      expect(result.hasilVerifikasi).toBe('DI_LUAR_JENDELA_WAKTU');
      if (result.hasilVerifikasi !== 'VALID') {
        expect(result.pesan).toBe('Waktu check-out di luar batas yang diizinkan');
      }
    });
  });
});
