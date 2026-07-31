import { HasilVerifikasi } from '@prisma/client';

export type ShiftAttendanceStatus =
  'HADIR' | 'BELUM' | 'TERLAMBAT' | 'IZIN' | 'TIDAK_HADIR';

export interface LogKehadiranSummaryInput {
  waktuCheckIn: Date | null;
  hasilVerifikasiCheckIn?: HasilVerifikasi | null;
}

/**
 * Fungsi terpusat untuk menentukan status kehadiran 1 shift berdasarkan aturan prioritas (Precedence):
 * 1. TIDAK_HADIR (LogKehadiran hasilVerifikasiCheckIn === TIDAK_HADIR via cron)
 * 2. TERLAMBAT / HADIR (LogKehadiran waktuCheckIn non-null, pembanding jamMulai tanpa grace period)
 * 3. IZIN (Karyawan memiliki PengajuanIzin APPROVED yang overlap tanggal)
 * 4. BELUM (Lainnya)
 */
export function determineShiftStatus(
  jamMulai: Date,
  logKehadiran: LogKehadiranSummaryInput | null | undefined,
  hasApprovedLeave: boolean,
): ShiftAttendanceStatus {
  if (logKehadiran?.hasilVerifikasiCheckIn === HasilVerifikasi.TIDAK_HADIR) {
    return 'TIDAK_HADIR';
  }
  if (logKehadiran?.waktuCheckIn) {
    return logKehadiran.waktuCheckIn.getTime() > jamMulai.getTime()
      ? 'TERLAMBAT'
      : 'HADIR';
  }
  if (hasApprovedLeave) {
    return 'IZIN';
  }
  return 'BELUM';
}
