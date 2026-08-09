import apiClient from '@/services/apiClient';
import { SuccessEnvelope } from '@/types/api';
import { SupervisorSiteItem } from '@/types/supervisor-site';

export const getSupervisorSites = async (): Promise<SupervisorSiteItem[]> => {
  const response = await apiClient.get<SuccessEnvelope<SupervisorSiteItem[]>>(
    '/supervisor-sites',
  );
  return response.data.data;
};
