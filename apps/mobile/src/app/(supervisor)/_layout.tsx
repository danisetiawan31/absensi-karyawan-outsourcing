import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/authStore';

export default function SupervisorLayout() {
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    if (role !== 'SUPERVISOR') {
      router.replace('/(auth)/login');
    }
  }, [role]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
