export type JenisIzin = 'SAKIT' | 'IZIN' | 'CUTI';

export type StatusIzin = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequestItem {
  id: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jenis: JenisIzin;
  alasan: string | null;
  dokumenPendukungUrl: string | null;
  status: StatusIzin;
  catatanSupervisor: string | null;
  createdAt: string;
  approvedBy: {
    nama: string;
  } | null;
}

export interface LeaveRequestPendingItem {
  id: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jenis: JenisIzin;
  alasan: string | null;
  dokumenPendukungUrl: string | null;
  status: StatusIzin;
  catatanSupervisor: string | null;
  createdAt: string;
  karyawan: {
    id: string;
    nama: string;
  };
}

export interface LeaveRequestHistoryItem {
  id: string;
  karyawanId: string;
  karyawan: {
    id: string;
    nama: string;
  };
  tanggalMulai: string;
  tanggalSelesai: string;
  jenis: JenisIzin;
  alasan: string | null;
  dokumenPendukungUrl: string | null;
  status: StatusIzin;
  catatanSupervisor: string | null;
  approvedById: string | null;
  approvedBy: {
    id: string;
    nama: string;
  } | null;
  createdAt: string;
}

export interface GetLeaveRequestsHistoryParams {
  karyawanId?: string;
  periodeMulai?: string;
  periodeSelesai?: string;
}

export interface CreateLeaveRequestResponse {
  id: string;
  status: StatusIzin;
}

export interface CancelLeaveRequestResponse {
  id: string;
  status: StatusIzin;
}

export interface SelectedDocumentFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}
