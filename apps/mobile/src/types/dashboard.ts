export type DashboardAttendanceStatus =
  | 'HADIR'
  | 'BELUM'
  | 'TERLAMBAT'
  | 'IZIN'
  | 'TIDAK_HADIR';

export interface DashboardAttendanceItem {
  karyawan: string;
  site: string;
  status: DashboardAttendanceStatus;
  waktuCheckIn: string | null;
}

export interface UnfilledShiftItem {
  jadwalId: string;
  karyawan: string;
  site: string;
  jamMulai: string;
  jamSelesai: string;
  menitTerlambat: number;
}
