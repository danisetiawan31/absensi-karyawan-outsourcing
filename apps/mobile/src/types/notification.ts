export type TipeNotifikasi =
  | 'PERUBAHAN_JADWAL'
  | 'REMINDER_CHECKIN'
  | 'ALERT_SUPERVISOR'
  | 'PENGAJUAN_IZIN_ORPHANED';

export interface NotificationItem {
  id: string;
  tipe: TipeNotifikasi;
  pesan: string;
  createdAt: string;
  dibaca: boolean;
}

export interface MarkAsReadResponse {
  success: boolean;
}
