import { HasilVerifikasi } from '@prisma/client';
import { determineShiftStatus } from './shift-status.util';

describe('shift-status.util', () => {
  const jamMulai = new Date('2026-09-15T08:00:00+07:00');

  it('should return TIDAK_HADIR when logKehadiran.hasilVerifikasiCheckIn is TIDAK_HADIR (cron precedence)', () => {
    const status = determineShiftStatus(
      jamMulai,
      {
        waktuCheckIn: null,
        hasilVerifikasiCheckIn: HasilVerifikasi.TIDAK_HADIR,
      },
      true, // Even with approved leave
    );
    expect(status).toBe('TIDAK_HADIR');
  });

  it('should return HADIR when waktuCheckIn <= jamMulai', () => {
    const status = determineShiftStatus(
      jamMulai,
      {
        waktuCheckIn: new Date('2026-09-15T08:00:00+07:00'),
        hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
      },
      false,
    );
    expect(status).toBe('HADIR');
  });

  it('should return TERLAMBAT when waktuCheckIn > jamMulai', () => {
    const status = determineShiftStatus(
      jamMulai,
      {
        waktuCheckIn: new Date('2026-09-15T08:01:00+07:00'),
        hasilVerifikasiCheckIn: HasilVerifikasi.VALID,
      },
      false,
    );
    expect(status).toBe('TERLAMBAT');
  });

  it('should return IZIN when waktuCheckIn is null and hasApprovedLeave is true', () => {
    const status = determineShiftStatus(jamMulai, null, true);
    expect(status).toBe('IZIN');
  });

  it('should return BELUM when waktuCheckIn is null and hasApprovedLeave is false', () => {
    const status = determineShiftStatus(jamMulai, null, false);
    expect(status).toBe('BELUM');
  });
});
