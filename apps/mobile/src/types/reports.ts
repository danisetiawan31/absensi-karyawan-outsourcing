import { HasilVerifikasi } from '@/types/attendance';

export type ReportFormat = 'pdf' | 'xlsx';

export interface AttendanceSummaryItem {
  karyawanId: string;
  nama: string;
  totalJadwal: number;
  totalHadir: number;
  totalTerlambat: number;
  totalTidakHadir: number;
  totalIzin: number;
  totalBelum: number;
}

export interface AttendanceAttemptItem {
  id: string;
  tipe: 'CHECK_IN' | 'CHECK_OUT';
  waktu: string;
  latitude: number;
  longitude: number;
  hasil: HasilVerifikasi;
  jadwalId: string;
}

export interface GetAttendanceSummaryParams {
  periodeMulai: string;
  periodeSelesai: string;
}

export interface GetAttendanceAttemptsParams {
  karyawanId: string;
  periodeMulai: string;
  periodeSelesai: string;
}
