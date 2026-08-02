import apiClient from '@/services/apiClient';
import { SuccessEnvelope } from '@/types/api';
import { ScheduleTodayItem } from '@/types/schedule';

export const getTodaySchedules = async (): Promise<ScheduleTodayItem[]> => {
  const response =
    await apiClient.get<SuccessEnvelope<ScheduleTodayItem[]>>(
      '/schedules/today',
    );
  return response.data.data;
};
