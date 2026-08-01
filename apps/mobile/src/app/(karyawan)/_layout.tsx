import { router, Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/authStore';

export default function KaryawanLayout() {
  const role = useAuthStore((state) => state.role);
  const wajahTerdaftar = useAuthStore((state) => state.wajahTerdaftar);
  const segments = useSegments();

  useEffect(() => {
    if (role !== 'KARYAWAN') {
      router.replace('/(auth)/login');
      return;
    }

    const currentRoute = segments[1];
    const isFaceRegFlow =
      !!currentRoute &&
      [
        'face-registration',
        'face-registration-preview',
        'face-registration-confirm',
      ].includes(currentRoute);

    if (!wajahTerdaftar && !isFaceRegFlow) {
      router.replace('/(karyawan)/face-registration');
    }
  }, [role, wajahTerdaftar, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
