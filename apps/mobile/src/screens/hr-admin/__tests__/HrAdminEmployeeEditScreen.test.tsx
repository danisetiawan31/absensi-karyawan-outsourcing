import axios from 'axios';
import {
  processEmployeeGeneralUpdateSubmit,
  processEmployeeResetFaceSubmit,
  processEmployeeRoleChangeSubmit,
} from '../HrAdminEmployeeEditScreen';

describe('HrAdminEmployeeEditScreen Presenter & Submit Logic', () => {
  let isAnyActionInFlightRef: { current: boolean };
  let setIsSubmitting: jest.Mock;
  let setServerError: jest.Mock;
  let setSuccessBanner: jest.Mock;
  let updateEmployeeFn: jest.Mock;
  let resetFaceRegistrationFn: jest.Mock;
  let invalidateQueriesFn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    isAnyActionInFlightRef = { current: false };
    setIsSubmitting = jest.fn();
    setServerError = jest.fn();
    setSuccessBanner = jest.fn();
    updateEmployeeFn = jest.fn();
    resetFaceRegistrationFn = jest.fn();
    invalidateQueriesFn = jest.fn();
  });

  describe('1. General Update Submit (Field Biasa)', () => {
    it('sukses update nama, email, statusAktif -> memanggil updateEmployeeFn tanpa modal', async () => {
      updateEmployeeFn.mockResolvedValue({
        id: 'emp-1',
        nama: 'Budi Edit',
        email: 'budi.edit@test.local',
        role: 'KARYAWAN',
        statusAktif: false,
        wajahTerdaftar: true,
      });

      const result = await processEmployeeGeneralUpdateSubmit({
        id: 'emp-1',
        nama: 'Budi Edit',
        email: 'budi.edit@test.local',
        statusAktif: false,
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        updateEmployeeFn,
        invalidateQueriesFn,
      });

      expect(result.success).toBe(true);
      expect(updateEmployeeFn).toHaveBeenCalledWith('emp-1', {
        nama: 'Budi Edit',
        email: 'budi.edit@test.local',
        statusAktif: false,
      });
      expect(invalidateQueriesFn).toHaveBeenCalledTimes(1);
      expect(setSuccessBanner).toHaveBeenCalledWith('Data karyawan berhasil diperbarui.');
    });

    it('error EMAIL_SUDAH_DIPAKAI (409) -> set error banner spesifik', async () => {
      const mockAxiosError = {
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            success: false,
            error: {
              code: 'EMAIL_SUDAH_DIPAKAI',
              message: 'Email sudah terdaftar. Gunakan email lain.',
            },
          },
        },
      };

      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      updateEmployeeFn.mockRejectedValue(mockAxiosError);

      const result = await processEmployeeGeneralUpdateSubmit({
        id: 'emp-1',
        nama: 'Budi Edit',
        email: 'duplikat@test.local',
        statusAktif: true,
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        updateEmployeeFn,
        invalidateQueriesFn,
      });

      expect(result.success).toBe(false);
      expect(result.isEmailAlreadyTaken).toBe(true);
      expect(setServerError).toHaveBeenCalledWith('Email sudah terdaftar. Gunakan email lain.');
    });

    it('double-tap guard -> tap kedua pada general submit diblokir', async () => {
      updateEmployeeFn.mockResolvedValue({});

      const p1 = processEmployeeGeneralUpdateSubmit({
        id: 'emp-1',
        nama: 'Budi',
        email: 'budi@test.local',
        statusAktif: true,
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        updateEmployeeFn,
        invalidateQueriesFn,
      });

      const p2 = processEmployeeGeneralUpdateSubmit({
        id: 'emp-1',
        nama: 'Budi',
        email: 'budi@test.local',
        statusAktif: true,
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        updateEmployeeFn,
        invalidateQueriesFn,
      });

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(false);
      expect(updateEmployeeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Role Change Submit', () => {
    it('sukses ubah role -> memanggil updateEmployeeFn dengan payload { role }', async () => {
      updateEmployeeFn.mockResolvedValue({});

      const result = await processEmployeeRoleChangeSubmit({
        id: 'emp-1',
        newRole: 'SUPERVISOR',
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        updateEmployeeFn,
        invalidateQueriesFn,
      });

      expect(result.success).toBe(true);
      expect(updateEmployeeFn).toHaveBeenCalledWith('emp-1', {
        role: 'SUPERVISOR',
      });
      expect(invalidateQueriesFn).toHaveBeenCalledTimes(1);
      expect(setSuccessBanner).toHaveBeenCalledWith('Role karyawan berhasil diubah menjadi SUPERVISOR.');
    });

    it('double-tap guard -> tap kedua pada role change diblokir', async () => {
      updateEmployeeFn.mockResolvedValue({});

      const p1 = processEmployeeRoleChangeSubmit({
        id: 'emp-1',
        newRole: 'HR_ADMIN',
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        updateEmployeeFn,
        invalidateQueriesFn,
      });

      const p2 = processEmployeeRoleChangeSubmit({
        id: 'emp-1',
        newRole: 'HR_ADMIN',
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        updateEmployeeFn,
        invalidateQueriesFn,
      });

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(false);
      expect(updateEmployeeFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Reset Face Registration Submit', () => {
    it('sukses reset wajah -> memanggil resetFaceRegistrationFn dengan id yang benar', async () => {
      resetFaceRegistrationFn.mockResolvedValue({});

      const result = await processEmployeeResetFaceSubmit({
        id: 'emp-1',
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        resetFaceRegistrationFn,
        invalidateQueriesFn,
      });

      expect(result.success).toBe(true);
      expect(resetFaceRegistrationFn).toHaveBeenCalledWith('emp-1');
      expect(invalidateQueriesFn).toHaveBeenCalledTimes(1);
      expect(setSuccessBanner).toHaveBeenCalledWith('Registrasi wajah karyawan berhasil Direset.');
    });

    it('double-tap guard -> tap kedua pada reset face diblokir', async () => {
      resetFaceRegistrationFn.mockResolvedValue({});

      const p1 = processEmployeeResetFaceSubmit({
        id: 'emp-1',
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        resetFaceRegistrationFn,
        invalidateQueriesFn,
      });

      const p2 = processEmployeeResetFaceSubmit({
        id: 'emp-1',
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        resetFaceRegistrationFn,
        invalidateQueriesFn,
      });

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(false);
      expect(resetFaceRegistrationFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Cross-Action Shared Lock Guard (Proteksi Lintas-Aksi)', () => {
    it('saat general update sedang in-flight, role change submit yang dipicu di tengah-tengah HARUS DIBLOKIR', async () => {
      let resolveGeneralUpdate!: (val: unknown) => void;
      const pendingGeneralUpdatePromise = new Promise<unknown>((resolve) => {
        resolveGeneralUpdate = resolve;
      });

      updateEmployeeFn.mockImplementation(() => pendingGeneralUpdatePromise);

      // 1. Jalankan general update submit (belum resolve / in-flight)
      const generalPromise = processEmployeeGeneralUpdateSubmit({
        id: 'emp-1',
        nama: 'Budi Pending',
        email: 'budi@test.local',
        statusAktif: true,
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        updateEmployeeFn,
        invalidateQueriesFn,
      });

      // Assert lock ref aktif
      expect(isAnyActionInFlightRef.current).toBe(true);

      // 2. Coba jalankan role change submit di tengah-tengah saat general update masih in-flight
      const roleChangeResult = await processEmployeeRoleChangeSubmit({
        id: 'emp-1',
        newRole: 'SUPERVISOR',
        isAnyActionInFlightRef,
        setIsSubmitting,
        setServerError,
        setSuccessBanner,
        updateEmployeeFn,
        invalidateQueriesFn,
      });

      // Assert role change submit langsung diblokir oleh shared lock
      expect(roleChangeResult.success).toBe(false);

      // Resolve general update
      resolveGeneralUpdate({ id: 'emp-1' });
      const generalResult = await generalPromise;

      expect(generalResult.success).toBe(true);
      // updateEmployeeFn hanya dipanggil 1 kali (untuk general update), role change tidak pernah dipanggil
      expect(updateEmployeeFn).toHaveBeenCalledTimes(1);
      expect(updateEmployeeFn).toHaveBeenCalledWith('emp-1', {
        nama: 'Budi Pending',
        email: 'budi@test.local',
        statusAktif: true,
      });
    });
  });
});
