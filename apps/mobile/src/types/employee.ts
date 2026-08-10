import { UserRole } from '@/types/api';

export interface AvailableEmployee {
  id: string;
  nama: string;
}

export interface Employee {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  statusAktif: boolean;
  wajahTerdaftar: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmployeePayload {
  nama: string;
  email: string;
  role: UserRole | string;
}

/**
 * NOTE: Field passwordSementara HANYA muncul di response POST /employees (create),
 * bersifat one-time-only, tidak bisa di-fetch ulang dari endpoint manapun.
 */
export interface CreateEmployeeResponse {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  statusAktif: boolean;
  wajahTerdaftar: boolean;
  passwordSementara: string;
  createdAt: string;
}

export interface UpdateEmployeePayload {
  nama?: string;
  email?: string;
  statusAktif?: boolean;
  role?: UserRole | string;
}

export interface GetEmployeesParams {
  search?: string;
  role?: UserRole | string;
  statusAktif?: boolean;
}
