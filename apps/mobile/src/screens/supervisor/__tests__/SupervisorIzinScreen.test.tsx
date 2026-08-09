import SupervisorIzinScreen, {
  processApprovalSubmit,
} from '../SupervisorIzinScreen';

describe('SupervisorIzinScreen Unit & Logic Suite', () => {
  it('1. harus mengekspor SupervisorIzinScreen sebagai fungsi komponen React', () => {
    expect(SupervisorIzinScreen).toBeDefined();
    expect(typeof SupervisorIzinScreen).toBe('function');
  });

  describe('2. processApprovalSubmit Logic & Guards', () => {
    it('2.1 Approve sukses -> memanggil approveFn dengan id dan catatanSupervisor, memanggil invalidateQueriesFn dan onSuccess', async () => {
      const isSubmittingRef = { current: false };
      const approveFn = jest.fn().mockResolvedValue({ id: 'req-1', status: 'APPROVED' });
      const rejectFn = jest.fn();
      const invalidateQueriesFn = jest.fn().mockResolvedValue(undefined);
      const refetchFn = jest.fn();
      const onSuccess = jest.fn();

      const result = await processApprovalSubmit({
        isApprove: true,
        id: 'req-1',
        catatanSupervisor: 'Istirahat yang cukup',
        isSubmittingRef,
        approveFn,
        rejectFn,
        invalidateQueriesFn,
        refetchFn,
        onSuccess,
      });

      expect(result.success).toBe(true);
      expect(approveFn).toHaveBeenCalledWith('req-1', 'Istirahat yang cukup');
      expect(rejectFn).not.toHaveBeenCalled();
      expect(invalidateQueriesFn).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(isSubmittingRef.current).toBe(false);
    });

    it('2.2 Approve tanpa catatanSupervisor -> mengirim undefined ke approveFn', async () => {
      const isSubmittingRef = { current: false };
      const approveFn = jest.fn().mockResolvedValue({ id: 'req-2', status: 'APPROVED' });
      const rejectFn = jest.fn();
      const invalidateQueriesFn = jest.fn();
      const refetchFn = jest.fn();
      const onSuccess = jest.fn();

      const result = await processApprovalSubmit({
        isApprove: true,
        id: 'req-2',
        catatanSupervisor: '   ',
        isSubmittingRef,
        approveFn,
        rejectFn,
        invalidateQueriesFn,
        refetchFn,
        onSuccess,
      });

      expect(result.success).toBe(true);
      expect(approveFn).toHaveBeenCalledWith('req-2', undefined);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('2.3 Reject sukses -> memanggil rejectFn dengan id dan catatanSupervisor', async () => {
      const isSubmittingRef = { current: false };
      const approveFn = jest.fn();
      const rejectFn = jest.fn().mockResolvedValue({ id: 'req-3', status: 'REJECTED' });
      const invalidateQueriesFn = jest.fn();
      const refetchFn = jest.fn();
      const onSuccess = jest.fn();

      const result = await processApprovalSubmit({
        isApprove: false,
        id: 'req-3',
        catatanSupervisor: 'Jadwal kerja padat',
        isSubmittingRef,
        approveFn,
        rejectFn,
        invalidateQueriesFn,
        refetchFn,
        onSuccess,
      });

      expect(result.success).toBe(true);
      expect(rejectFn).toHaveBeenCalledWith('req-3', 'Jadwal kerja padat');
      expect(approveFn).not.toHaveBeenCalled();
      expect(invalidateQueriesFn).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('2.4 Handle HTTP 409 IZIN_SUDAH_DIPROSES -> memanggil refetchFn dan mengembalikan pesan error jelas', async () => {
      const isSubmittingRef = { current: false };
      const err409 = {
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            error: {
              code: 'IZIN_SUDAH_DIPROSES',
              message: 'Pengajuan izin ini sudah diproses atau dibatalkan oleh karyawan.',
            },
          },
        },
      };

      const approveFn = jest.fn().mockRejectedValue(err409);
      const rejectFn = jest.fn();
      const invalidateQueriesFn = jest.fn();
      const refetchFn = jest.fn().mockResolvedValue(undefined);
      const onSuccess = jest.fn();

      const result = await processApprovalSubmit({
        isApprove: true,
        id: 'req-409',
        catatanSupervisor: undefined,
        isSubmittingRef,
        approveFn,
        rejectFn,
        invalidateQueriesFn,
        refetchFn,
        onSuccess,
      });

      expect(result.success).toBe(false);
      expect(result.isConflict409).toBe(true);
      expect(result.errorMessage).toBe(
        'Pengajuan izin ini sudah diproses atau dibatalkan oleh karyawan.',
      );
      expect(refetchFn).toHaveBeenCalledTimes(1);
      expect(onSuccess).not.toHaveBeenCalled();
      expect(isSubmittingRef.current).toBe(false);
    });

    it('2.5 Double-tap approve guard -> submitFn HANYA dipanggil 1x meski dipanggil 2x back-to-back dalam tick sinkron', async () => {
      const isSubmittingRef = { current: false };
      let resolveApprove: (val: any) => void;
      const slowApprovePromise = new Promise((res) => {
        resolveApprove = res;
      });

      const approveFn = jest.fn().mockImplementation(() => slowApprovePromise);
      const rejectFn = jest.fn();
      const invalidateQueriesFn = jest.fn();
      const refetchFn = jest.fn();
      const onSuccess = jest.fn();

      const call1Promise = processApprovalSubmit({
        isApprove: true,
        id: 'req-race-1',
        catatanSupervisor: undefined,
        isSubmittingRef,
        approveFn,
        rejectFn,
        invalidateQueriesFn,
        refetchFn,
        onSuccess,
      });

      // Call 2 synchronously while call 1 is awaiting approveFn
      const call2Promise = processApprovalSubmit({
        isApprove: true,
        id: 'req-race-1',
        catatanSupervisor: undefined,
        isSubmittingRef,
        approveFn,
        rejectFn,
        invalidateQueriesFn,
        refetchFn,
        onSuccess,
      });

      // Resolve call 1
      resolveApprove!({ id: 'req-race-1', status: 'APPROVED' });

      const [res1, res2] = await Promise.all([call1Promise, call2Promise]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(false);
      expect(approveFn).toHaveBeenCalledTimes(1);
    });
  });
});
