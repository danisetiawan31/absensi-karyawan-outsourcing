import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS } from '@/constants/theme';
import apiClient from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import { ErrorEnvelope } from '@/types/api';

export default function FaceConfirmScreen() {
  const { photoUri } = useLocalSearchParams<{ photoUri?: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!photoUri) {
      router.replace('/(karyawan)/face-registration');
    }
  }, [photoUri]);

  if (!photoUri) return null;

  const handleRetake = () => {
    router.replace('/(karyawan)/face-registration');
  };

  const handleSubmit = async () => {
    if (!photoUri || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      const filename = photoUri.split('/').pop() || 'face.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // @ts-expect-error React Native FormData file signature
      formData.append('foto', {
        uri: photoUri,
        name: filename,
        type,
      });

      await apiClient.post('/users/me/face-registration', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60s HTTP timeout untuk memproses DeepFace di backend
      });

      // Update state authStore & SecureStore secara persisten
      await useAuthStore.getState().setWajahTerdaftar(true);

      // Selesai -> Redirect ke Dashboard Karyawan
      router.replace('/(karyawan)');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setErrorMsg('Gagal terhubung ke server. Periksa koneksi jaringan Anda.');
        } else {
          const body = err.response.data as ErrorEnvelope | undefined;
          setErrorMsg(
            body?.error?.message || 'Gagal mendaftarkan wajah. Silakan coba lagi.'
          );
        }
      } else {
        setErrorMsg('Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Full-screen Image Preview */}
      <Image
        source={{ uri: photoUri }}
        className="flex-1"
        style={{ transform: [{ scaleX: -1 }] }}
        resizeMode="cover"
        accessibilityLabel="Konfirmasi foto wajah"
      />

      {/* Loading Overlay saat upload + proses DeepFace */}
      {isLoading && (
        <View className="absolute inset-0 bg-black/80 justify-center items-center p-6 z-50">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="text-white font-sans-bold text-[16px] text-center mt-4 leading-6">
            Memproses & mendaftarkan wajah Anda, mohon tunggu...
          </Text>
          <Text className="text-white/60 font-sans-regular text-[13px] text-center mt-2">
            Proses ini bisa memakan waktu hingga 30 detik
          </Text>
        </View>
      )}

      {/* Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-black/80 p-6 pb-10 gap-4">
        {/* Banner Error jika submit gagal */}
        {errorMsg && (
          <View className="bg-destructive-bg p-3 rounded-lg border border-destructive">
            <Text className="text-destructive-text font-sans-semibold text-[13px] text-center">
              {errorMsg}
            </Text>
          </View>
        )}

        <View className="flex-row gap-4 items-center justify-between">
          {/* Tombol Foto Ulang */}
          <TouchableOpacity
            className="flex-1 bg-zinc-800 border border-white/20 h-[48px] rounded-lg items-center justify-center active:opacity-80"
            onPress={handleRetake}
            disabled={isLoading}
            accessibilityLabel="Tombol foto ulang"
            accessibilityRole="button"
          >
            <Text className="text-white font-sans-semibold text-[15px]">
              Foto Ulang
            </Text>
          </TouchableOpacity>

          {/* Tombol Kirim & Selesai (atau Coba Kirim Lagi jika error) */}
          <TouchableOpacity
            className="flex-1 bg-primary h-[48px] rounded-lg items-center justify-center active:opacity-80"
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityLabel="Tombol kirim registrasi wajah"
            accessibilityRole="button"
          >
            <Text className="text-on-primary font-sans-bold text-[15px]">
              {errorMsg ? 'Coba Kirim Lagi' : 'Kirim & Selesai'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
