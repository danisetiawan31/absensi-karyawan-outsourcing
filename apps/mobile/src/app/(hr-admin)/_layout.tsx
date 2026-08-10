import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import React, { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/store/authStore";

export default function HrAdminLayout() {
  const role = useAuthStore((state) => state.role);
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, 12);
  const barHeight = 56 + bottomPadding;

  useEffect(() => {
    if (role !== "HR_ADMIN") {
      router.replace("/(auth)/login");
    }
  }, [role]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E4E4DF",
          borderTopWidth: 1,
          height: barHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "PlusJakartaSans-SemiBold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Karyawan",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="site"
        options={{
          title: "Site",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "business" : "business-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="izin"
        options={{
          title: "Izin",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "document-text" : "document-text-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="laporan"
        options={{
          title: "Laporan",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bar-chart" : "bar-chart-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
