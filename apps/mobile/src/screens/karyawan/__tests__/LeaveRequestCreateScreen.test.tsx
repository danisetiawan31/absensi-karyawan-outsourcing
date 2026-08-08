import { SelectedDocumentFile } from '@/types/leave-request';
import {
  formatDateToYmd,
  isDocumentRequired,
  processLeaveRequestSubmit,
  validateLeaveRequestForm,
} from '../LeaveRequestCreateScreen';

describe('LeaveRequestCreateScreen Unit Tests', () => {
  const dateToday = new Date('2026-08-10T00:00:00.000Z');
  const dateTomorrow = new Date('2026-08-11T00:00:00.000Z');
  const dateYesterday = new Date('2026-08-09T00:00:00.000Z');

  const dummyDoc: SelectedDocumentFile = {
    uri: 'file:///path/surat_dokter.pdf',
    name: 'surat_dokter.pdf',
    size: 2 * 1024 * 1024,
    type: 'application/pdf',
  };

  describe('1. Dynamic DOKUMEN_WAJIB Logic (4 Combinations)', () => {
    it('1.1 SAKIT 1 hari tanpa dokumen -> Boleh (dokumen opsional)', () => {
      expect(isDocumentRequired('SAKIT', dateToday, dateToday)).toBe(false);
      const val = validateLeaveRequestForm(
        'SAKIT',
        dateToday,
        dateToday,
        null,
      );
      expect(val.isValid).toBe(true);
    });

    it('1.2 SAKIT >1 hari tanpa dokumen -> BLOCKED dengan pesan error jelas', () => {
      expect(isDocumentRequired('SAKIT', dateToday, dateTomorrow)).toBe(true);
      const val = validateLeaveRequestForm(
        'SAKIT',
        dateToday,
        dateTomorrow,
        null,
      );
      expect(val.isValid).toBe(false);
      expect(val.errorMessage).toContain('Dokumen pendukung (surat dokter) wajib');
    });

    it('1.3 SAKIT >1 hari dengan dokumen -> Boleh submit', () => {
      expect(isDocumentRequired('SAKIT', dateToday, dateTomorrow)).toBe(true);
      const val = validateLeaveRequestForm(
        'SAKIT',
        dateToday,
        dateTomorrow,
        dummyDoc,
      );
      expect(val.isValid).toBe(true);
    });

    it('1.4 IZIN/CUTI apapun durasinya tanpa dokumen -> Boleh submit', () => {
      expect(isDocumentRequired('IZIN', dateToday, dateTomorrow)).toBe(false);
      const valIzin = validateLeaveRequestForm(
        'IZIN',
        dateToday,
        dateTomorrow,
        null,
      );
      expect(valIzin.isValid).toBe(true);

      expect(isDocumentRequired('CUTI', dateToday, dateTomorrow)).toBe(false);
      const valCuti = validateLeaveRequestForm(
        'CUTI',
        dateToday,
        dateTomorrow,
        null,
      );
      expect(valCuti.isValid).toBe(true);
    });
  });

  describe('2. Date Range Validation', () => {
    it('tanggalSelesai < tanggalMulai -> BLOCKED dengan pesan error jelas', () => {
      const val = validateLeaveRequestForm(
        'IZIN',
        dateToday,
        dateYesterday,
        null,
      );
      expect(val.isValid).toBe(false);
      expect(val.errorMessage).toBe(
        'Tanggal selesai tidak boleh sebelum tanggal mulai',
      );
    });
  });

  describe('3. File Size Validation (Maks 5MB)', () => {
    it('dokumen > 5MB -> ditolak client-side', () => {
      const oversizedDoc: SelectedDocumentFile = {
        uri: 'file:///path/huge_file.pdf',
        name: 'huge_file.pdf',
        size: 6 * 1024 * 1024, // 6MB
        type: 'application/pdf',
      };
      const val = validateLeaveRequestForm(
        'IZIN',
        dateToday,
        dateToday,
        oversizedDoc,
      );
      expect(val.isValid).toBe(false);
      expect(val.errorMessage).toBe('Ukuran dokumen tidak boleh melebihi 5MB');
    });
  });

  describe('4. Submit Success & Error Handling', () => {
    it('Submit sukses -> memanggil submitFn, invalidateQueriesFn, DAN navigateBackFn', async () => {
      const isSubmittingRef = { current: false };
      const submitFn = jest.fn().mockResolvedValue({
        id: 'req-123',
        status: 'PENDING',
      });
      const invalidateQueriesFn = jest.fn().mockResolvedValue(undefined);
      const navigateBackFn = jest.fn();

      const result = await processLeaveRequestSubmit({
        jenis: 'IZIN',
        tanggalMulai: dateToday,
        tanggalSelesai: dateToday,
        alasan: 'Acara keluarga',
        dokumen: null,
        isSubmittingRef,
        submitFn,
        invalidateQueriesFn,
        navigateBackFn,
      });

      expect(result.success).toBe(true);
      expect(submitFn).toHaveBeenCalledWith(
        formatDateToYmd(dateToday),
        formatDateToYmd(dateToday),
        'IZIN',
        'Acara keluarga',
        undefined,
      );
      expect(invalidateQueriesFn).toHaveBeenCalledTimes(1);
      expect(navigateBackFn).toHaveBeenCalledTimes(1);
    });

    it('Submit gagal (mock server error IZIN_BENTROK) -> mengembalikan errorMessage, TIDAK navigasi', async () => {
      const isSubmittingRef = { current: false };
      const serverErr = {
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            error: {
              code: 'IZIN_BENTROK',
              message: 'Sudah ada pengajuan izin yang disetujui pada tanggal tersebut.',
            },
          },
        },
      };
      const submitFn = jest.fn().mockRejectedValue(serverErr);
      const invalidateQueriesFn = jest.fn();
      const navigateBackFn = jest.fn();

      const result = await processLeaveRequestSubmit({
        jenis: 'IZIN',
        tanggalMulai: dateToday,
        tanggalSelesai: dateToday,
        alasan: 'Bentrok',
        dokumen: null,
        isSubmittingRef,
        submitFn,
        invalidateQueriesFn,
        navigateBackFn,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe(
        'Sudah ada pengajuan izin yang disetujui pada tanggal tersebut.',
      );
      expect(navigateBackFn).not.toHaveBeenCalled();
    });
  });

  describe('5. Double-Tap Guard Race Condition Simulation', () => {
    it('Double-tap sinkron -> submitFn HANYA dipanggil 1x meski dipanggil 2x back-to-back dalam tick sinkron', async () => {
      const isSubmittingRef = { current: false };
      let resolveSubmit: (val: any) => void;
      const slowSubmitPromise = new Promise((res) => {
        resolveSubmit = res;
      });

      const submitFn = jest.fn().mockImplementation(() => slowSubmitPromise);
      const invalidateQueriesFn = jest.fn();
      const navigateBackFn = jest.fn();

      const call1Promise = processLeaveRequestSubmit({
        jenis: 'CUTI',
        tanggalMulai: dateToday,
        tanggalSelesai: dateToday,
        alasan: 'Cuti tahunan',
        dokumen: null,
        isSubmittingRef,
        submitFn,
        invalidateQueriesFn,
        navigateBackFn,
      });

      // Call 2 synchronously while call 1 is awaiting submitFn
      const call2Promise = processLeaveRequestSubmit({
        jenis: 'CUTI',
        tanggalMulai: dateToday,
        tanggalSelesai: dateToday,
        alasan: 'Cuti tahunan',
        dokumen: null,
        isSubmittingRef,
        submitFn,
        invalidateQueriesFn,
        navigateBackFn,
      });

      // Resolve call 1
      resolveSubmit!({ id: 'req-cuti-1', status: 'PENDING' });

      const [res1, res2] = await Promise.all([call1Promise, call2Promise]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(false);
      expect(submitFn).toHaveBeenCalledTimes(1);
    });
  });
});
