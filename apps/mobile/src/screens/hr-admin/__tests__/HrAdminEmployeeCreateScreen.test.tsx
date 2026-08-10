import axios from 'axios';
import { processEmployeeCreateSubmit } from '../HrAdminEmployeeCreateScreen';

describe('HrAdminEmployeeCreateScreen Logic & Submit Presenter', () => {
  let isSubmittingRef: { current: boolean };
  let setIsSubmitting: jest.Mock;
  let setServerError: jest.Mock;
  let createEmployeeFn: jest.Mock;
  let routerPush: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    isSubmittingRef = { current: false };
    setIsSubmitting = jest.fn();
    setServerError = jest.fn();
    createEmployeeFn = jest.fn();
    routerPush = jest.fn();
  });

  it('1. Submit sukses -> assert createEmployeeFn dipanggil dengan payload dan navigasi ke password-reveal dengan params yang benar', async () => {
    createEmployeeFn.mockResolvedValue({
      id: 'emp-new-123',
      nama: 'Budi Santoso',
      email: 'budi@test.local',
      role: 'KARYAWAN',
      statusAktif: true,
      wajahTerdaftar: false,
      passwordSementara: 'Pass1234',
      createdAt: '2026-08-10T08:00:00.000Z',
    });

    const result = await processEmployeeCreateSubmit({
      nama: 'Budi Santoso',
      email: 'budi@test.local',
      role: 'KARYAWAN',
      isSubmittingRef,
      setIsSubmitting,
      setServerError,
      createEmployeeFn,
      routerPush,
    });

    expect(result.success).toBe(true);
    expect(createEmployeeFn).toHaveBeenCalledWith({
      nama: 'Budi Santoso',
      email: 'budi@test.local',
      role: 'KARYAWAN',
    });
    expect(setServerError).toHaveBeenCalledWith(null);
    expect(routerPush).toHaveBeenCalledWith({
      pathname: '/(hr-admin)/employee-password-reveal',
      params: {
        nama: 'Budi Santoso',
        passwordSementara: 'Pass1234',
      },
    });
  });

  it('2. Error EMAIL_SUDAH_DIPAKAI (409) -> set error spesifik, TIDAK navigasi ke password-reveal screen', async () => {
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
    createEmployeeFn.mockRejectedValue(mockAxiosError);

    const result = await processEmployeeCreateSubmit({
      nama: 'Budi Santoso',
      email: 'duplikat@test.local',
      role: 'KARYAWAN',
      isSubmittingRef,
      setIsSubmitting,
      setServerError,
      createEmployeeFn,
      routerPush,
    });

    expect(result.success).toBe(false);
    expect(result.isEmailAlreadyTaken).toBe(true);
    expect(setServerError).toHaveBeenCalledWith('Email sudah terdaftar. Gunakan email lain.');
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('3. Double-tap submit guard -> panggilan kedua diblokir secara ref lock', async () => {
    createEmployeeFn.mockResolvedValue({
      id: 'emp-1',
      nama: 'Ahmad',
      email: 'ahmad@test.local',
      role: 'KARYAWAN',
      statusAktif: true,
      wajahTerdaftar: false,
      passwordSementara: 'Pass5678',
      createdAt: '2026-08-10T08:00:00.000Z',
    });

    const p1 = processEmployeeCreateSubmit({
      nama: 'Ahmad',
      email: 'ahmad@test.local',
      role: 'KARYAWAN',
      isSubmittingRef,
      setIsSubmitting,
      setServerError,
      createEmployeeFn,
      routerPush,
    });

    const p2 = processEmployeeCreateSubmit({
      nama: 'Ahmad',
      email: 'ahmad@test.local',
      role: 'KARYAWAN',
      isSubmittingRef,
      setIsSubmitting,
      setServerError,
      createEmployeeFn,
      routerPush,
    });

    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(false);
    expect(createEmployeeFn).toHaveBeenCalledTimes(1);
  });
});
