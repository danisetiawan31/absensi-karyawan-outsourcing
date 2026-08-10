import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

export default function SupervisorLayout() {
  const role = useAuthStore((state) => state.role);
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, 12);
  const barHeight = 56 + bottomPadding;

  useEffect(() => {
    if (role !== 'SUPERVISOR') {
      router.replace('/(auth)/login');
    }
  }, [role]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E4E4DF',
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'PlusJakartaSans-SemiBold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="jadwal"
        options={{
          title: 'Jadwal',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="izin"
        options={{
          title: 'Izin',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifikasi"
        options={{
          title: 'Notifikasi',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* Hidden Screens */}
      <Tabs.Screen
        name="jadwal-form"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
