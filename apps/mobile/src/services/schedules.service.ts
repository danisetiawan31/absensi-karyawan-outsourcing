import apiClient from '@/services/apiClient';
import { SuccessEnvelope } from '@/types/api';
import {
  CreateSchedulePayload,
  ScheduleItem,
  UpdateSchedulePayload,
} from '@/types/schedule';

export const getSchedules = async (
  tanggal: string,
  siteId?: string,
): Promise<ScheduleItem[]> => {
  const params: Record<string, string> = { tanggal };
  if (siteId) {
    params.siteId = siteId;
  }

  const response = await apiClient.get<SuccessEnvelope<ScheduleItem[]>>(
    '/schedules',
    { params },
  );
  return response.data.data;
};

export const createSchedule = async (
  payload: CreateSchedulePayload,
): Promise<ScheduleItem> => {
  const response = await apiClient.post<SuccessEnvelope<ScheduleItem>>(
    '/schedules',
    payload,
  );
  return response.data.data;
};

export const updateSchedule = async (
  id: string,
  payload: UpdateSchedulePayload,
): Promise<ScheduleItem> => {
  const response = await apiClient.patch<SuccessEnvelope<ScheduleItem>>(
    `/schedules/${id}`,
    payload,
  );
  return response.data.data;
};

export const deleteSchedule = async (
  id: string,
): Promise<{ success: boolean }> => {
  const response = await apiClient.delete<
    SuccessEnvelope<{ success: boolean }>
  >(`/schedules/${id}`);
  return response.data.data;
};
