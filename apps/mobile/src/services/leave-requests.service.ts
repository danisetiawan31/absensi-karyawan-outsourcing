import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import apiClient from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import { SuccessEnvelope } from '@/types/api';
import {
  CancelLeaveRequestResponse,
  CreateLeaveRequestResponse,
  GetLeaveRequestsHistoryParams,
  JenisIzin,
  LeaveRequestHistoryItem,
  LeaveRequestItem,
  LeaveRequestPendingItem,
  SelectedDocumentFile,
} from '@/types/leave-request';

export const createLeaveRequestFormData = (
  tanggalMulai: string,
  tanggalSelesai: string,
  jenis: JenisIzin,
  alasan: string,
  dokumen?: SelectedDocumentFile | string,
): FormData => {
  const formData = new FormData();
  formData.append('tanggalMulai', tanggalMulai);
  formData.append('tanggalSelesai', tanggalSelesai);
  formData.append('jenis', jenis);
  formData.append('alasan', alasan);

  if (dokumen) {
    if (typeof dokumen === 'string') {
      const filename = dokumen.split('/').pop() || 'dokumen.pdf';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : '';
      const type =
        ext === 'pdf'
          ? 'application/pdf'
          : ext === 'png'
          ? 'image/png'
          : 'image/jpeg';
      // @ts-expect-error React Native FormData file signature
      formData.append('dokumen', {
        uri: dokumen,
        name: filename,
        type,
      });
    } else {
      const filename =
        dokumen.name || dokumen.uri.split('/').pop() || 'dokumen.pdf';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : '';
      const type =
        dokumen.type ||
        (ext === 'pdf'
          ? 'application/pdf'
          : ext === 'png'
          ? 'image/png'
          : 'image/jpeg');
      // @ts-expect-error React Native FormData file signature
      formData.append('dokumen', {
        uri: dokumen.uri,
        name: filename,
        type,
      });
    }
  }

  return formData;
};

export const getLeaveRequests = async (): Promise<LeaveRequestItem[]> => {
  const response = await apiClient.get<SuccessEnvelope<LeaveRequestItem[]>>(
    '/leave-requests',
  );
  return response.data.data;
};

export const createLeaveRequest = async (
  tanggalMulai: string,
  tanggalSelesai: string,
  jenis: JenisIzin,
  alasan: string,
  dokumen?: SelectedDocumentFile | string,
): Promise<CreateLeaveRequestResponse> => {
  const formData = createLeaveRequestFormData(
    tanggalMulai,
    tanggalSelesai,
    jenis,
    alasan,
    dokumen,
  );
  const response = await apiClient.post<
    SuccessEnvelope<CreateLeaveRequestResponse>
  >('/leave-requests', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });
  return response.data.data;
};

export const cancelLeaveRequest = async (
  id: string,
): Promise<CancelLeaveRequestResponse> => {
  const response = await apiClient.patch<
    SuccessEnvelope<CancelLeaveRequestResponse>
  >(`/leave-requests/${id}/cancel`);
  return response.data.data;
};

export const getPendingLeaveRequests = async (): Promise<
  LeaveRequestPendingItem[]
> => {
  const response = await apiClient.get<
    SuccessEnvelope<LeaveRequestPendingItem[]>
  >('/leave-requests', {
    params: { status: 'PENDING' },
  });
  return response.data.data;
};

export const approveLeaveRequest = async (
  id: string,
  catatanSupervisor?: string,
): Promise<{ id: string; status: string }> => {
  const payload = catatanSupervisor !== undefined ? { catatanSupervisor } : {};
  const response = await apiClient.patch<
    SuccessEnvelope<{ id: string; status: string }>
  >(`/leave-requests/${id}/approve`, payload);
  return response.data.data;
};

export const rejectLeaveRequest = async (
  id: string,
  catatanSupervisor?: string,
): Promise<{ id: string; status: string }> => {
  const payload = catatanSupervisor !== undefined ? { catatanSupervisor } : {};
  const response = await apiClient.patch<
    SuccessEnvelope<{ id: string; status: string }>
  >(`/leave-requests/${id}/reject`, payload);
  return response.data.data;
};

export const getLeaveRequestsHistory = async (
  params?: GetLeaveRequestsHistoryParams,
): Promise<LeaveRequestHistoryItem[]> => {
  const response = await apiClient.get<
    SuccessEnvelope<LeaveRequestHistoryItem[]>
  >('/leave-requests/history', { params });
  return response.data.data;
};

export const downloadAndOpenDocument = async (
  id: string,
  filename: string,
): Promise<void> => {
  const token = useAuthStore.getState().accessToken;
  const baseUrl = apiClient.defaults.baseURL || '';
  const url = `${baseUrl}/leave-requests/${id}/dokumen`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status !== 200) {
    throw new Error(`Gagal mengunduh dokumen. (HTTP ${result.status})`);
  }

  await Sharing.shareAsync(result.uri);
};
