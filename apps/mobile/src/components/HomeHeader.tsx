import { router } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { getInitials } from '@/screens/common/ProfileScreen';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/api';

export interface HomeHeaderProps {
  greeting?: string;
  nama?: string | null;
  role?: UserRole | null;
  profileRoute?: string;
  testID?: string;
}

const DEFAULT_PROFILE_ROUTES: Record<UserRole, string> = {
  KARYAWAN: '/(karyawan)/profile',
  SUPERVISOR: '/(supervisor)/profile',
  HR_ADMIN: '/(hr-admin)/profile',
};

const DEFAULT_FALLBACK_NAMES: Record<UserRole, string> = {
  KARYAWAN: 'Karyawan',
  SUPERVISOR: 'Supervisor',
  HR_ADMIN: 'HR Admin',
};

export function HomeHeader({
  greeting = 'Selamat Datang',
  nama: propsNama,
  role: propsRole,
  profileRoute,
  testID = 'home-header',
}: HomeHeaderProps) {
  let nama = propsNama;
  let role = propsRole;

  if (propsNama === undefined || propsRole === undefined) {
    try {
      const storeState = useAuthStore.getState();
      if (nama === undefined) nama = storeState.nama;
      if (role === undefined) role = storeState.role;
    } catch {
      // Fallback
    }
  }

  const initials = getInitials(nama);
  const fallbackName = role ? DEFAULT_FALLBACK_NAMES[role] : 'Pengguna';
  const targetRoute =
    profileRoute || (role ? DEFAULT_PROFILE_ROUTES[role] : '/(auth)/login');

  return (
    <View
      className="flex-row items-center justify-between border-b border-border bg-surface px-6 pb-4 pt-12 shadow-xs"
      testID={testID}
    >
      <View className="flex-1 pr-4">
        <Text className="font-sans text-xs text-muted">{greeting}</Text>
        <Text
          className="font-sans-bold text-xl text-foreground"
          numberOfLines={1}
        >
          Halo, {nama || fallbackName}
        </Text>
      </View>
      <TouchableOpacity
        className="h-12 w-12 items-center justify-center rounded-full bg-primary shadow-sm active:opacity-80"
        onPress={() => router.push(targetRoute as any)}
        testID="button-avatar-profile"
      >
        <Text className="font-sans-extrabold text-base text-on-primary">
          {initials}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
