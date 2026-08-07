import apiClient from '@/services/apiClient';
import { SuccessEnvelope } from '@/types/api';
import {
  CheckInResponse,
  CheckOutResponse,
  PhotoInput,
} from '@/types/attendance';

export const createAttendanceFormData = (
  jadwalId: string,
  latitude: number,
  longitude: number,
  foto: PhotoInput,
): FormData => {
  const formData = new FormData();
  formData.append('jadwalId', jadwalId);
  formData.append('latitude', latitude.toString());
  formData.append('longitude', longitude.toString());

  if (typeof foto === 'string') {
    const filename = foto.split('/').pop() || 'attendance.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    // @ts-expect-error React Native FormData file signature
    formData.append('foto', {
      uri: foto,
      name: filename,
      type,
    });
  } else {
    const filename = foto.name || foto.uri.split('/').pop() || 'attendance.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = foto.type || (match ? `image/${match[1]}` : 'image/jpeg');
    // @ts-expect-error React Native FormData file signature
    formData.append('foto', {
      uri: foto.uri,
      name: filename,
      type,
    });
  }

  return formData;
};

export const checkIn = async (
  jadwalId: string,
  latitude: number,
  longitude: number,
  foto: PhotoInput,
): Promise<CheckInResponse> => {
  const formData = createAttendanceFormData(jadwalId, latitude, longitude, foto);
  const response = await apiClient.post<SuccessEnvelope<CheckInResponse>>(
    '/attendance/check-in',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    },
  );
  return response.data.data;
};

export const checkOut = async (
  jadwalId: string,
  latitude: number,
  longitude: number,
  foto: PhotoInput,
): Promise<CheckOutResponse> => {
  const formData = createAttendanceFormData(jadwalId, latitude, longitude, foto);
  const response = await apiClient.post<SuccessEnvelope<CheckOutResponse>>(
    '/attendance/check-out',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    },
  );
  return response.data.data;
};
