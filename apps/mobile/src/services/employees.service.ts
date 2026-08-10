import apiClient from '@/services/apiClient';
import { SuccessEnvelope } from '@/types/api';
import {
  AvailableEmployee,
  CreateEmployeePayload,
  CreateEmployeeResponse,
  Employee,
  GetEmployeesParams,
  UpdateEmployeePayload,
} from '@/types/employee';

export const getAvailableEmployees = async (
  tanggal: string,
  siteId: string,
): Promise<AvailableEmployee[]> => {
  const response = await apiClient.get<SuccessEnvelope<AvailableEmployee[]>>(
    '/employees/available',
    {
      params: { tanggal, siteId },
    },
  );
  return response.data.data;
};

export const getEmployees = async (
  params?: GetEmployeesParams,
): Promise<Employee[]> => {
  const response = await apiClient.get<SuccessEnvelope<Employee[]>>(
    '/employees',
    { params },
  );
  return response.data.data;
};

export const createEmployee = async (
  payload: CreateEmployeePayload,
): Promise<CreateEmployeeResponse> => {
  const response = await apiClient.post<SuccessEnvelope<CreateEmployeeResponse>>(
    '/employees',
    payload,
  );
  return response.data.data;
};

export const updateEmployee = async (
  id: string,
  payload: UpdateEmployeePayload,
): Promise<Employee> => {
  const response = await apiClient.patch<SuccessEnvelope<Employee>>(
    `/employees/${id}`,
    payload,
  );
  return response.data.data;
};

export const resetFaceRegistration = async (
  id: string,
): Promise<{ success: boolean }> => {
  const response = await apiClient.post<SuccessEnvelope<{ success: boolean }>>(
    `/employees/${id}/reset-face-registration`,
  );
  return response.data.data;
};
