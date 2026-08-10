import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import apiClient from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import { SuccessEnvelope } from '@/types/api';
import {
  AttendanceAttemptItem,
  AttendanceSummaryItem,
  ReportFormat,
} from '@/types/reports';

export const getAttendanceSummary = async (
  periodeMulai: string,
  periodeSelesai: string,
): Promise<AttendanceSummaryItem[]> => {
  const response = await apiClient.get<
    SuccessEnvelope<AttendanceSummaryItem[]>
  >('/attendance/summary', {
    params: { periodeMulai, periodeSelesai },
  });
  return response.data.data;
};

export const getAttendanceAttempts = async (
  karyawanId: string,
  periodeMulai: string,
  periodeSelesai: string,
): Promise<AttendanceAttemptItem[]> => {
  const response = await apiClient.get<
    SuccessEnvelope<AttendanceAttemptItem[]>
  >('/attendance/attempts', {
    params: { karyawanId, periodeMulai, periodeSelesai },
  });
  return response.data.data;
};

export const downloadAndOpenReport = async (
  format: ReportFormat,
  periodeMulai: string,
  periodeSelesai: string,
): Promise<void> => {
  const token = useAuthStore.getState().accessToken;
  const baseUrl = apiClient.defaults.baseURL || '';
  const queryString = `format=${format}&periodeMulai=${encodeURIComponent(
    periodeMulai,
  )}&periodeSelesai=${encodeURIComponent(periodeSelesai)}`;
  const url = `${baseUrl}/reports/export?${queryString}`;

  const filename = `laporan-kehadiran-${periodeMulai}-${periodeSelesai}.${format}`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (result.status !== 200) {
    throw new Error(`Gagal mengunduh laporan. (HTTP ${result.status})`);
  }

  await Sharing.shareAsync(result.uri);
};
