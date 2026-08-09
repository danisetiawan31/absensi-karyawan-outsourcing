export type StatusKehadiran = 'BELUM_CHECKIN' | 'SUDAH_CHECKIN' | 'SELESAI';

export interface ScheduleTodayItem {
  jadwalId: string;
  site: {
    nama: string;
    alamat: string;
    latitude: number;
    longitude: number;
    radiusToleransi: number;
  };
  jamMulai: string;
  jamSelesai: string;
  statusKehadiran: StatusKehadiran;
  waktuCheckIn?: string | null;
  waktuCheckOut?: string | null;
}

export interface ScheduleItem {
  id: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  karyawanId?: string;
  siteId?: string;
  karyawan: {
    id: string;
    nama: string;
  };
  site: {
    id: string;
    nama: string;
  };
}

export interface CreateSchedulePayload {
  karyawanId: string;
  siteId: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
}

export type UpdateSchedulePayload = Partial<CreateSchedulePayload>;
