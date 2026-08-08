import apiClient from '@/services/apiClient';
import { SuccessEnvelope } from '@/types/api';
import { MarkAsReadResponse, NotificationItem } from '@/types/notification';

export const getNotifications = async (): Promise<NotificationItem[]> => {
  const response = await apiClient.get<SuccessEnvelope<NotificationItem[]>>(
    '/notifications',
  );
  return response.data.data;
};

export const markAsRead = async (id: string): Promise<MarkAsReadResponse> => {
  const response = await apiClient.patch<SuccessEnvelope<MarkAsReadResponse>>(
    `/notifications/${id}/read`,
  );
  return response.data.data;
};
