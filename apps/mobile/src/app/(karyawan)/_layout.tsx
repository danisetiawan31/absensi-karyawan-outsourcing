import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/authStore';

export default function KaryawanLayout() {
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    if (role !== 'KARYAWAN') {
      router.replace('/(auth)/login');
    }
  }, [role]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
