export type UserRole = 'KARYAWAN' | 'SUPERVISOR' | 'HR_ADMIN';

export interface AuthData {
  accessToken: string;
  role: UserRole;
  userId: string;
  nama: string;
  wajahTerdaftar: boolean;
  wajibGantiPassword: boolean;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  path?: string;
  pagination?: PaginationMeta;
}

export interface ErrorDetail {
  field?: string;
  issue: string;
}

export interface ErrorBody {
  code: string;
  message: string;
  details?: ErrorDetail[];
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: ErrorBody;
  meta: ResponseMeta;
}
