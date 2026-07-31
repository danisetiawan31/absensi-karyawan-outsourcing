import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/authStore';

export default function HrAdminLayout() {
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    if (role !== 'HR_ADMIN') {
      router.replace('/(auth)/login');
    }
  }, [role]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
