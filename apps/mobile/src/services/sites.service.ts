import apiClient from '@/services/apiClient';
import { SuccessEnvelope } from '@/types/api';
import { CreateSitePayload, Site, UpdateSitePayload } from '@/types/site';

export const getSites = async (statusAktif?: boolean): Promise<Site[]> => {
  const response = await apiClient.get<SuccessEnvelope<Site[]>>('/sites', {
    params: statusAktif !== undefined ? { statusAktif } : undefined,
  });
  return response.data.data;
};

export const createSite = async (payload: CreateSitePayload): Promise<Site> => {
  const response = await apiClient.post<SuccessEnvelope<Site>>('/sites', payload);
  return response.data.data;
};

export const updateSite = async (
  id: string,
  payload: UpdateSitePayload,
): Promise<Site> => {
  const response = await apiClient.patch<SuccessEnvelope<Site>>(
    `/sites/${id}`,
    payload,
  );
  return response.data.data;
};
