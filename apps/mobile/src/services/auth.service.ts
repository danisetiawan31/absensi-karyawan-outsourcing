import apiClient from '@/services/apiClient';
import { SuccessEnvelope } from '@/types/api';

export interface ChangePasswordPayload {
  passwordLama: string;
  passwordBaru: string;
}

export const changePassword = async (
  payload: ChangePasswordPayload,
): Promise<{ success: boolean }> => {
  const response = await apiClient.post<SuccessEnvelope<{ success: boolean }>>(
    '/auth/change-password',
    payload,
  );
  return response.data.data;
};
