import {
  buildGetEmployeesParams,
  getStatusAktifBadgeConfig,
  getWajahTerdaftarBadgeConfig,
  navigateToAddEmployee,
  navigateToEditEmployee,
} from '../HrAdminEmployeesScreen';

describe('HrAdminEmployeesScreen Logic, Badge Configs, & Navigation', () => {
  describe('getStatusAktifBadgeConfig (Badge 1: Status Aktif)', () => {
    it('harus mengembalikan label Aktif dan text-emerald-700 jika statusAktif=true', () => {
      const config = getStatusAktifBadgeConfig(true);
      expect(config.text).toBe('Aktif');
      expect(config.isSuccess).toBe(true);
      expect(config.textClassName).toBe('text-emerald-700');
    });

    it('harus mengembalikan label Nonaktif dan text-slate-500 jika statusAktif=false', () => {
      const config = getStatusAktifBadgeConfig(false);
      expect(config.text).toBe('Nonaktif');
      expect(config.isSuccess).toBe(false);
      expect(config.textClassName).toBe('text-slate-500');
    });
  });

  describe('getWajahTerdaftarBadgeConfig (Badge 2: Wajah Terdaftar)', () => {
    it('harus mengembalikan label Wajah Terdaftar dan text-emerald-700 jika wajahTerdaftar=true', () => {
      const config = getWajahTerdaftarBadgeConfig(true);
      expect(config.text).toBe('Wajah Terdaftar');
      expect(config.isSuccess).toBe(true);
      expect(config.textClassName).toBe('text-emerald-700');
    });

    it('harus mengembalikan label Wajah Belum Terdaftar dan text-slate-500 (BUKAN text-emerald-700) jika wajahTerdaftar=false', () => {
      const config = getWajahTerdaftarBadgeConfig(false);
      expect(config.text).toBe('Wajah Belum Terdaftar');
      expect(config.isSuccess).toBe(false);
      // Regression guard test: pastikan warna teks untuk wajahTerdaftar=false ADALAH text-slate-500, BUKAN text-emerald-700
      expect(config.textClassName).toBe('text-slate-500');
      expect(config.textClassName).not.toBe('text-emerald-700');
    });
  });

  describe('buildGetEmployeesParams (Konstruksi Parameter Query API)', () => {
    it('harus mengonversi "SEMUA" role & status ke undefined saat tidak ada filter aktif', () => {
      const params = buildGetEmployeesParams('', 'SEMUA', 'SEMUA');
      expect(params).toEqual({
        search: undefined,
        role: undefined,
        statusAktif: undefined,
      });
    });

    it('harus mengonversi kata kunci pencarian (trimmed) dengan benar', () => {
      const params = buildGetEmployeesParams('  Ahmad  ', 'SEMUA', 'SEMUA');
      expect(params).toEqual({
        search: 'Ahmad',
        role: undefined,
        statusAktif: undefined,
      });
    });

    it('harus mengonversi role spesifik (KARYAWAN/SUPERVISOR/HR_ADMIN)', () => {
      const params1 = buildGetEmployeesParams('', 'KARYAWAN', 'SEMUA');
      expect(params1.role).toBe('KARYAWAN');

      const params2 = buildGetEmployeesParams('', 'SUPERVISOR', 'SEMUA');
      expect(params2.role).toBe('SUPERVISOR');

      const params3 = buildGetEmployeesParams('', 'HR_ADMIN', 'SEMUA');
      expect(params3.role).toBe('HR_ADMIN');
    });

    it('harus mengonversi filter status AKTIF (true) dan NONAKTIF (false)', () => {
      const params1 = buildGetEmployeesParams('', 'SEMUA', 'AKTIF');
      expect(params1.statusAktif).toBe(true);

      const params2 = buildGetEmployeesParams('', 'SEMUA', 'NONAKTIF');
      expect(params2.statusAktif).toBe(false);
    });

    it('harus mengombinasikan pencarian, role, dan status secara tepat', () => {
      const params = buildGetEmployeesParams('Budi', 'SUPERVISOR', 'AKTIF');
      expect(params).toEqual({
        search: 'Budi',
        role: 'SUPERVISOR',
        statusAktif: true,
      });
    });
  });

  describe('Navigation Helper Functions', () => {
    it('navigateToAddEmployee harus memanggil pushFn dengan /(hr-admin)/employee-create', () => {
      const pushFn = jest.fn();
      navigateToAddEmployee(pushFn);
      expect(pushFn).toHaveBeenCalledWith('/(hr-admin)/employee-create');
    });

    it('navigateToEditEmployee harus memanggil pushFn dengan route employee-edit dan params id', () => {
      const pushFn = jest.fn();
      navigateToEditEmployee(pushFn, 'user-123');
      expect(pushFn).toHaveBeenCalledWith({
        pathname: '/(hr-admin)/employee-edit',
        params: { id: 'user-123' },
      });
    });
  });
});
