import apiClient from '@/services/apiClient';
import { SuccessEnvelope } from '@/types/api';
import { AvailableEmployee } from '@/types/employee';

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
