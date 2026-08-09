import { formatJakartaYmd } from '@/utils/date.util';

import SupervisorJadwalFormScreen, {
  calculateShiftDurationHours,
  getInitialSelectedDate,
  processScheduleSubmit,
  validateScheduleForm,
} from '../SupervisorJadwalFormScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/services/schedules.service', () => ({
  getSchedules: jest.fn().mockResolvedValue([]),
  createSchedule: jest.fn(),
  updateSchedule: jest.fn(),
}));

jest.mock('@/services/supervisor-sites.service', () => ({
  getSupervisorSites: jest.fn().mockResolvedValue([
    { id: 'ss-1', site: { id: 'site-1', nama: 'Site A', alamat: 'Jl A' } },
  ]),
}));

jest.mock('@/services/employees.service', () => ({
  getAvailableEmployees: jest.fn().mockResolvedValue([
    { id: 'user-1', nama: 'Budi Santoso' },
  ]),
}));

describe('SupervisorJadwalFormScreen Unit & Integration Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. calculateShiftDurationHours', () => {
    it('1.1 harus menghitung durasi shift normal (misal 08:00 - 16:00 = 8 jam)', () => {
      const duration = calculateShiftDurationHours('08:00', '16:00');
      expect(duration).toBe(8);
    });

    it('1.2 harus menghitung durasi shift malam melintasi tengah malam (misal 22:00 - 06:00 = 8 jam)', () => {
      const duration = calculateShiftDurationHours('22:00', '06:00');
      expect(duration).toBe(8);
    });

    it('1.3 harus mengembalikan 0 jika jam mulai dan jam selesai sama', () => {
      const duration = calculateShiftDurationHours('08:00', '08:00');
      expect(duration).toBe(0);
    });
  });

  describe('2. validateScheduleForm', () => {
    it('2.1 harus menolak jika siteId belum dipilih', () => {
      const res = validateScheduleForm('user-1', '', '2026-08-10', '08:00', '16:00');
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('site');
    });

    it('2.2 harus menolak jika karyawanId belum dipilih', () => {
      const res = validateScheduleForm('', 'site-1', '2026-08-10', '08:00', '16:00');
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('Karyawan');
    });

    it('2.3 harus menolak jika durasi shift 0 jam atau > 16 jam', () => {
      const zeroRes = validateScheduleForm(
        'user-1',
        'site-1',
        '2026-08-10',
        '08:00',
        '08:00',
      );
      expect(zeroRes.isValid).toBe(false);
      expect(zeroRes.errorMessage).toContain('Durasi shift tidak valid');

      const overRes = validateScheduleForm(
        'user-1',
        'site-1',
        '2026-08-10',
        '06:00',
        '00:00',
      );
      expect(overRes.isValid).toBe(false);
      expect(overRes.errorMessage).toContain('Durasi shift tidak valid');
    });

    it('2.4 harus menerima jika semua field valid dan durasi shift 1 - 16 jam', () => {
      const validRes = validateScheduleForm(
        'user-1',
        'site-1',
        '2026-08-10',
        '08:00',
        '16:00',
      );
      expect(validRes.isValid).toBe(true);
      expect(validRes.errorMessage).toBeUndefined();
    });
  });

  describe('3. Double-Tap Guard Race Condition Simulation', () => {
    it('Double-tap sinkron -> submitFn/updateFn HANYA dipanggil 1x meski dipanggil 2x back-to-back dalam tick sinkron', async () => {
      const isSubmittingRef = { current: false };
      let resolveSubmit: (val: any) => void;
      const slowSubmitPromise = new Promise((res) => {
        resolveSubmit = res;
      });

      const submitFn = jest.fn().mockImplementation(() => slowSubmitPromise);
      const invalidateQueriesFn = jest.fn();
      const navigateBackFn = jest.fn();

      const call1Promise = processScheduleSubmit({
        isEditMode: false,
        karyawanId: 'user-1',
        siteId: 'site-1',
        tanggalYmd: '2026-08-10',
        jamMulai: '08:00',
        jamSelesai: '16:00',
        isSubmittingRef,
        submitFn,
        invalidateQueriesFn,
        navigateBackFn,
      });

      // Call 2 synchronously while call 1 is awaiting submitFn
      const call2Promise = processScheduleSubmit({
        isEditMode: false,
        karyawanId: 'user-1',
        siteId: 'site-1',
        tanggalYmd: '2026-08-10',
        jamMulai: '08:00',
        jamSelesai: '16:00',
        isSubmittingRef,
        submitFn,
        invalidateQueriesFn,
        navigateBackFn,
      });

      // Resolve call 1
      resolveSubmit!({ id: 'schedule-created-1' });

      const [res1, res2] = await Promise.all([call1Promise, call2Promise]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(false);
      expect(submitFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Genuine Edit Mode Date Parameter Resolution (getInitialSelectedDate)', () => {
    it('4.1 Mode edit dengan tanggal BUKAN hari ini (misal 2026-11-20) -> genuinely menyelesaikan ke tanggal 2026-11-20, BUKAN hari ini', () => {
      const customDateParam = '2026-11-20';
      const initialDate = getInitialSelectedDate(customDateParam);
      const formattedDate = formatJakartaYmd(initialDate);

      expect(formattedDate).toBe('2026-11-20');
      expect(initialDate.getFullYear()).toBe(2026);
      expect(initialDate.getMonth()).toBe(10); // 0-indexed November
      expect(initialDate.getDate()).toBe(20);
    });

    it('4.2 Tanpa parameter tanggal (Mode Create) -> menyelesaikan ke tanggal hari ini sebagai fallback', () => {
      const defaultDate = getInitialSelectedDate(undefined);
      const expectedYmd = formatJakartaYmd(new Date());

      expect(formatJakartaYmd(defaultDate)).toBe(expectedYmd);
    });
  });
});
