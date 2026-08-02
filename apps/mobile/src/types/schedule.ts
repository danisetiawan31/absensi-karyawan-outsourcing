export type StatusKehadiran = "BELUM_CHECKIN" | "SUDAH_CHECKIN" | "SELESAI";

export interface SiteDetail {
  nama: string;
  alamat: string;
  latitude: number;
  longitude: number;
  radiusToleransi: number;
}

export interface ScheduleTodayItem {
  jadwalId: string;
  site: SiteDetail;
  jamMulai: string;
  jamSelesai: string;
  statusKehadiran: StatusKehadiran;
}
