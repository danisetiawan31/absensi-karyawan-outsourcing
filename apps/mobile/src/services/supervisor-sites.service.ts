import apiClient from '@/services/apiClient';
import { SuccessEnvelope } from '@/types/api';
import {
  CreateSupervisorSitePayload,
  SupervisorSiteItem,
} from '@/types/supervisor-site';

export const getSupervisorSites = async (
  supervisorId?: string,
): Promise<SupervisorSiteItem[]> => {
  const response = await apiClient.get<SuccessEnvelope<SupervisorSiteItem[]>>(
    '/supervisor-sites',
    {
      params: supervisorId ? { supervisorId } : undefined,
    },
  );
  return response.data.data;
};

export const createSupervisorSite = async (
  payload: CreateSupervisorSitePayload,
): Promise<{ id: string }> => {
  const response = await apiClient.post<SuccessEnvelope<{ id: string }>>(
    '/supervisor-sites',
    payload,
  );
  return response.data.data;
};

export const deleteSupervisorSite = async (
  id: string,
): Promise<{ success: boolean }> => {
  const response = await apiClient.delete<SuccessEnvelope<{ success: boolean }>>(
    `/supervisor-sites/${id}`,
  );
  return response.data.data;
};
