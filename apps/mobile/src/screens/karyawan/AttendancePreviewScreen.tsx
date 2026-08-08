import axios from 'axios';
import { Href, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

import { checkIn, checkOut } from '@/services/attendance.service';
import { ErrorEnvelope } from '@/types/api';

export interface HardErrorState {
  code: string;
  message: string;
  showAbsensiButton: boolean;
}

export interface ProcessSubmitParams {
  photoUri?: string;
  latitude?: string;
  longitude?: string;
  jadwalId?: string;
  tipe?: 'CHECK_IN' | 'CHECK_OUT';
  isLoading: boolean;
  isSubmittingRef?: { current: boolean };
  setIsLoading: (val: boolean) => void;
  setControlledError: (msg: string | null) => void;
  setHardError: (err: HardErrorState | null) => void;
  checkInFn: typeof checkIn;
  checkOutFn: typeof checkOut;
  routerReplace: (opt: Href) => void;
}

export async function processAttendanceSubmit({
  photoUri,
  latitude,
  longitude,
  jadwalId,
  tipe = 'CHECK_IN',
  isLoading,
  isSubmittingRef,
  setIsLoading,
  setControlledError,
  setHardError,
  checkInFn,
  checkOutFn,
  routerReplace,
}: ProcessSubmitParams): Promise<boolean> {
  if (!photoUri || !jadwalId || isLoading || isSubmittingRef?.current) {
    return false;
  }

  if (isSubmittingRef) {
    isSubmittingRef.current = true;
  }
  setIsLoading(true);
  setControlledError(null);
  setHardError(null);

  try {
    const latNum = parseFloat(latitude || '0') || 0;
    const lonNum = parseFloat(longitude || '0') || 0;

    const result =
      tipe === 'CHECK_OUT'
        ? await checkOutFn(jadwalId, latNum, lonNum, photoUri)
        : await checkInFn(jadwalId, latNum, lonNum, photoUri);

    if (result.hasilVerifikasi === 'VALID') {
      const params: Record<string, string> = {
        tipe,
        logId: result.logId,
      };

      if ('waktuCheckIn' in result && result.waktuCheckIn) {
        params.waktuCheckIn = result.waktuCheckIn;
      }
      if ('waktuCheckOut' in result && result.waktuCheckOut) {
        params.waktuCheckOut = result.waktuCheckOut;
      }

      routerReplace({
        pathname: '/(karyawan)/attendance-success',
        params,
      });
      return true;
    } else {
      setControlledError(
        result.pesan || 'Verifikasi presensi gagal. Silakan coba lagi.',
      );
      return false;
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (
        err.code === 'ECONNABORTED' ||
        err.message?.toLowerCase().includes('timeout')
      ) {
        setHardError({
          code: 'TIMEOUT',
          message: 'Koneksi lambat, silakan coba lagi',
          showAbsensiButton: false,
        });
      } else if (err.response) {
        const body = err.response.data as ErrorEnvelope | undefined;
        setHardError({
          code: body?.error?.code || 'ERROR_SERVER',
          message: body?.error?.message || 'Terjadi kesalahan pada server.',
          showAbsensiButton: true,
        });
      } else {
        setHardError({
          code: 'NETWORK_ERROR',
          message: 'Gagal terhubung ke server. Periksa koneksi jaringan Anda.',
          showAbsensiButton: false,
        });
      }
    } else {
      setHardError({
        code: 'UNKNOWN_ERROR',
        message: 'Terjadi kesalahan tidak terduga. Silakan coba lagi.',
        showAbsensiButton: false,
      });
    }
    return false;
  } finally {
    if (isSubmittingRef) {
      isSubmittingRef.current = false;
    }
    setIsLoading(false);
  }
}

export default function AttendancePreviewScreen() {
  const { photoUri, latitude, longitude, jadwalId, tipe } =
    useLocalSearchParams<{
      photoUri?: string;
      latitude?: string;
      longitude?: string;
      jadwalId?: string;
      tipe?: 'CHECK_IN' | 'CHECK_OUT';
    }>();

  const [isLoading, setIsLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [controlledError, setControlledError] = useState<string | null>(null);
  const [hardError, setHardError] = useState<HardErrorState | null>(null);

  useEffect(() => {
    if (!photoUri || !jadwalId) {
      router.replace('/(karyawan)/absensi');
    }
  }, [photoUri, jadwalId]);

  if (!photoUri || !jadwalId) return null;

  const handleRetake = () => {
    const params: Record<string, string> = { jadwalId };
    if (tipe) params.tipe = tipe;

    router.replace({
      pathname: '/(karyawan)/attendance-camera',
      params,
    });
  };

  const handleSubmit = () => {
    processAttendanceSubmit({
      photoUri,
      latitude,
      longitude,
      jadwalId,
      tipe,
      isLoading,
      isSubmittingRef,
      setIsLoading,
      setControlledError,
      setHardError,
      checkInFn: checkIn,
      checkOutFn: checkOut,
      routerReplace: (opt) => router.replace(opt),
    });
  };

  return (
    <View className="flex-1 bg-black">
      {/* Preview Image */}
      <Image
        source={{ uri: photoUri }}
        className="flex-1"
        style={{ transform: [{ scaleX: -1 }] }}
        resizeMode="cover"
        accessibilityLabel="Preview foto presensi"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <View
          className="absolute inset-0 bg-black/80 justify-center items-center p-6 z-50"
          testID="loading-overlay"
        >
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="text-white font-sans-bold text-[16px] text-center mt-4 leading-6">
            Memverifikasi & mengirim presensi Anda...
          </Text>
          <Text className="text-white/60 font-sans-regular text-[13px] text-center mt-2">
            Mohon tunggu hingga proses verifikasi selesai
          </Text>
        </View>
      )}

      {/* Bottom Action / Banner Error Container */}
      <View className="absolute bottom-0 left-0 right-0 bg-black/85 p-6 pb-10 gap-4 z-40">
        {/* Controlled Error Banner */}
        {controlledError && (
          <View
            className="bg-amber-950/90 p-4 rounded-xl border border-amber-500 shadow-md"
            testID="controlled-error-banner"
          >
            <Text className="text-amber-300 font-sans-bold text-[14px] mb-1">
              Verifikasi Presensi Belum Lolos
            </Text>
            <Text className="text-amber-100 font-sans-regular text-[13px] leading-5">
              {controlledError}
            </Text>
          </View>
        )}

        {/* Hard Error / Timeout Banner */}
        {hardError && (
          <View
            className="bg-rose-950/90 p-4 rounded-xl border border-rose-500 shadow-md"
            testID="hard-error-banner"
          >
            <Text className="text-rose-300 font-sans-bold text-[14px] mb-1">
              Gagal Memproses Presensi
            </Text>
            <Text className="text-rose-100 font-sans-regular text-[13px] leading-5 mb-3">
              {hardError.message}
            </Text>

            {hardError.showAbsensiButton && (
              <TouchableOpacity
                className="bg-white/20 border border-white/40 py-2 rounded-lg items-center active:opacity-80"
                onPress={() => router.replace('/(karyawan)/absensi')}
                testID="button-back-to-absensi"
              >
                <Text className="text-white font-sans-semibold text-[13px]">
                  Kembali ke Tab Absensi
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-4 items-center justify-between">
          <TouchableOpacity
            className="flex-1 bg-zinc-800 border border-white/20 h-[48px] rounded-lg items-center justify-center active:opacity-80"
            onPress={handleRetake}
            disabled={isLoading}
            testID="button-retake"
          >
            <Text className="text-white font-sans-semibold text-[15px]">
              Ambil Ulang
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 bg-primary h-[48px] rounded-lg items-center justify-center active:opacity-80 ${
              isLoading ? 'opacity-50' : ''
            }`}
            onPress={handleSubmit}
            disabled={isLoading}
            testID="button-submit"
          >
            <Text className="text-on-primary font-sans-bold text-[15px]">
              {controlledError || hardError ? 'Coba Kirim Lagi' : 'Kirim Foto Presensi'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
