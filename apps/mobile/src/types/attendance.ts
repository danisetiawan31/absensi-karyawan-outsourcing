export type HasilVerifikasi =
  | 'VALID'
  | 'GAGAL_LOKASI'
  | 'GAGAL_WAJAH'
  | 'GAGAL_LIVENESS'
  | 'DI_LUAR_JENDELA_WAKTU'
  | 'TIDAK_HADIR';

export interface CheckInSuccessResult {
  logId: string;
  waktuCheckIn: string;
  hasilVerifikasi: 'VALID';
}

export interface CheckOutSuccessResult {
  logId: string;
  waktuCheckOut: string;
  hasilVerifikasi: 'VALID';
}

export interface ControlledFailureResult {
  hasilVerifikasi: Exclude<HasilVerifikasi, 'VALID'>;
  pesan: string;
}

export type CheckInResponse = CheckInSuccessResult | ControlledFailureResult;
export type CheckOutResponse = CheckOutSuccessResult | ControlledFailureResult;

export interface PhotoFile {
  uri: string;
  name?: string;
  type?: string;
}

export type PhotoInput = PhotoFile | string;
