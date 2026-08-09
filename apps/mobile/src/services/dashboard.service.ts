import apiClient from '@/services/apiClient';
import { SuccessEnvelope } from '@/types/api';
import {
  DashboardAttendanceItem,
  UnfilledShiftItem,
} from '@/types/dashboard';

export const getAttendanceDashboard = async (
  tanggal: string,
): Promise<DashboardAttendanceItem[]> => {
  const response = await apiClient.get<
    SuccessEnvelope<DashboardAttendanceItem[]>
  >('/dashboard/attendance', {
    params: { tanggal },
  });
  return response.data.data;
};

export const getUnfilledShifts = async (
  tanggal: string,
): Promise<UnfilledShiftItem[]> => {
  const response = await apiClient.get<SuccessEnvelope<UnfilledShiftItem[]>>(
    '/dashboard/unfilled-shifts',
    {
      params: { tanggal },
    },
  );
  return response.data.data;
};
