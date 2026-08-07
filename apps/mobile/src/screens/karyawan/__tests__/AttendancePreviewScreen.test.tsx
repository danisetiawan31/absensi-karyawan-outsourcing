import axios from 'axios';
import { processAttendanceSubmit } from '../AttendancePreviewScreen';
import { formatAttendanceTime } from '../AttendanceSuccessScreen';

describe('AttendancePreviewScreen & Success Logic', () => {
  describe('formatAttendanceTime', () => {
    it('harus memformat ISO date string ke WIB format HH:mm WIB', () => {
      const iso = '2026-08-07T08:30:00.000Z';
      const formatted = formatAttendanceTime(iso);
      expect(formatted).toMatch(/\d{2}:\d{2} WIB/);
    });

    it('harus mengembalikan --:-- WIB jika input undefined atau kosong', () => {
      expect(formatAttendanceTime(undefined)).toBe('--:-- WIB');
      expect(formatAttendanceTime('')).toBe('--:-- WIB');
    });
  });

  describe('processAttendanceSubmit', () => {
    let setIsLoading: jest.Mock;
    let setControlledError: jest.Mock;
    let setHardError: jest.Mock;
    let checkInFn: jest.Mock;
    let checkOutFn: jest.Mock;
    let routerReplace: jest.Mock;

    beforeEach(() => {
      setIsLoading = jest.fn();
      setControlledError = jest.fn();
      setHardError = jest.fn();
      checkInFn = jest.fn();
      checkOutFn = jest.fn();
      routerReplace = jest.fn();
    });

    it('1. Submit sukses (VALID) -> assert navigasi ke AttendanceSuccessScreen dengan data yang benar', async () => {
      checkInFn.mockResolvedValue({
        logId: 'log-checkin-999',
        waktuCheckIn: '2026-08-07T08:00:00.000Z',
        hasilVerifikasi: 'VALID',
      });

      const result = await processAttendanceSubmit({
        photoUri: 'file:///photo.jpg',
        latitude: '-6.2088',
        longitude: '106.8456',
        jadwalId: 'jadwal-123',
        tipe: 'CHECK_IN',
        isLoading: false,
        setIsLoading,
        setControlledError,
        setHardError,
        checkInFn,
        checkOutFn,
        routerReplace,
      });

      expect(result).toBe(true);
      expect(checkInFn).toHaveBeenCalledWith(
        'jadwal-123',
        -6.2088,
        106.8456,
        'file:///photo.jpg',
      );
      expect(routerReplace).toHaveBeenCalledWith({
        pathname: '/(karyawan)/attendance-success',
        params: {
          tipe: 'CHECK_IN',
          waktuCheckIn: '2026-08-07T08:00:00.000Z',
          waktuCheckOut: undefined,
          logId: 'log-checkin-999',
        },
      });
      expect(setControlledError).toHaveBeenLastCalledWith(null);
      expect(setHardError).toHaveBeenLastCalledWith(null);
    });

    it('2. Submit gagal-terkontrol (GAGAL_LOKASI) -> assert pesan error tampil di screen ini, retry tersedia tanpa navigasi balik ke kamera', async () => {
      checkInFn.mockResolvedValue({
        hasilVerifikasi: 'GAGAL_LOKASI',
        pesan: 'Anda berada di luar radius lokasi site',
      });

      const result = await processAttendanceSubmit({
        photoUri: 'file:///photo.jpg',
        latitude: '-6.2088',
        longitude: '106.8456',
        jadwalId: 'jadwal-123',
        tipe: 'CHECK_IN',
        isLoading: false,
        setIsLoading,
        setControlledError,
        setHardError,
        checkInFn,
        checkOutFn,
        routerReplace,
      });

      expect(result).toBe(false);
      expect(setControlledError).toHaveBeenCalledWith(
        'Anda berada di luar radius lokasi site',
      );
      expect(routerReplace).not.toHaveBeenCalled();
    });

    it('3. Submit error hard (SUDAH_CHECKIN, mock HTTP 409) -> assert pesan error generik/server, assert tombol kembali ke tab Absensi tersedia', async () => {
      const mockAxiosError = {
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            success: false,
            error: {
              code: 'SUDAH_CHECKIN',
              message: 'Anda sudah melakukan check-in untuk jadwal ini',
            },
          },
        },
      };

      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      checkInFn.mockRejectedValue(mockAxiosError);

      const result = await processAttendanceSubmit({
        photoUri: 'file:///photo.jpg',
        latitude: '-6.2088',
        longitude: '106.8456',
        jadwalId: 'jadwal-123',
        tipe: 'CHECK_IN',
        isLoading: false,
        setIsLoading,
        setControlledError,
        setHardError,
        checkInFn,
        checkOutFn,
        routerReplace,
      });

      expect(result).toBe(false);
      expect(setHardError).toHaveBeenCalledWith({
        code: 'SUDAH_CHECKIN',
        message: 'Anda sudah melakukan check-in untuk jadwal ini',
        showAbsensiButton: true,
      });
      expect(routerReplace).not.toHaveBeenCalled();
    });

    it('4. Submit timeout -> assert pesan spesifik timeout "Koneksi lambat, silakan coba lagi"', async () => {
      const mockTimeoutError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 60000ms exceeded',
      };

      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      checkInFn.mockRejectedValue(mockTimeoutError);

      const result = await processAttendanceSubmit({
        photoUri: 'file:///photo.jpg',
        latitude: '-6.2088',
        longitude: '106.8456',
        jadwalId: 'jadwal-123',
        tipe: 'CHECK_IN',
        isLoading: false,
        setIsLoading,
        setControlledError,
        setHardError,
        checkInFn,
        checkOutFn,
        routerReplace,
      });

      expect(result).toBe(false);
      expect(setHardError).toHaveBeenCalledWith({
        code: 'TIMEOUT',
        message: 'Koneksi lambat, silakan coba lagi',
        showAbsensiButton: false,
      });
      expect(routerReplace).not.toHaveBeenCalled();
    });

    it('5. Double-tap submit -> assert checkIn/checkOut cuma terpanggil 1x meski dipanggil 2x cepat berurutan dalam tick sinkron', async () => {
      checkInFn.mockResolvedValue({
        logId: 'log-1',
        waktuCheckIn: '2026-08-07T08:00:00Z',
        hasilVerifikasi: 'VALID',
      });

      const isSubmittingRef = { current: false };

      // Dipanggil 2x back-to-back dalam tick sinkron yang sama, KEDUA panggilan mengirim isLoading: false.
      // Ref lock (isSubmittingRef) wajib memblokir panggilan kedua secara sinkron.
      const p1 = processAttendanceSubmit({
        photoUri: 'file:///photo.jpg',
        latitude: '-6.2088',
        longitude: '106.8456',
        jadwalId: 'jadwal-123',
        tipe: 'CHECK_IN',
        isLoading: false,
        isSubmittingRef,
        setIsLoading,
        setControlledError,
        setHardError,
        checkInFn,
        checkOutFn,
        routerReplace,
      });

      const p2 = processAttendanceSubmit({
        photoUri: 'file:///photo.jpg',
        latitude: '-6.2088',
        longitude: '106.8456',
        jadwalId: 'jadwal-123',
        tipe: 'CHECK_IN',
        isLoading: false, // Tanpa manipulasi manual ke true!
        isSubmittingRef,
        setIsLoading,
        setControlledError,
        setHardError,
        checkInFn,
        checkOutFn,
        routerReplace,
      });

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1).toBe(true);
      expect(res2).toBe(false);
      expect(checkInFn).toHaveBeenCalledTimes(1);
    });
  });
});
