export interface Site {
  id: string;
  nama: string;
  alamat: string;
  latitude: number;
  longitude: number;
  radiusToleransi: number;
  statusAktif: boolean;
}

export interface CreateSitePayload {
  nama: string;
  alamat: string;
  latitude: number;
  longitude: number;
  radiusToleransi?: number;
}

export interface UpdateSitePayload {
  nama?: string;
  alamat?: string;
  latitude?: number;
  longitude?: number;
  radiusToleransi?: number;
  statusAktif?: boolean;
}
