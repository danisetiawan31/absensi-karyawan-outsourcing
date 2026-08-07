import { Ionicons } from '@expo/vector-icons';
import { router, Tabs, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/store/authStore";

export default function KaryawanLayout() {
  const role = useAuthStore((state) => state.role);
  const wajahTerdaftar = useAuthStore((state) => state.wajahTerdaftar);
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, 12);
  const barHeight = 56 + bottomPadding;

  useEffect(() => {
    if (role !== "KARYAWAN") {
      router.replace("/(auth)/login");
      return;
    }

    const currentRoute = segments[1];
    const isFaceRegFlow =
      !!currentRoute &&
      [
        "face-registration",
        "face-registration-preview",
        "face-registration-confirm",
        "attendance-camera",
        "attendance-preview",
        "attendance-success",
      ].includes(currentRoute);

    if (!wajahTerdaftar && !isFaceRegFlow) {
      router.replace("/(karyawan)/face-registration");
    }
  }, [role, wajahTerdaftar, segments]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FFC81E",
        tabBarInactiveTintColor: "#64748B",
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
          title: "Beranda",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
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
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="absensi"
        options={{
          title: "Absensi",
          tabBarIcon: () => (
            <View style={styles.elevatedButtonContainer}>
              <View style={styles.elevatedButton}>
                <Ionicons name="camera" size={26} color="#1E1B16" />
              </View>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="notifikasi"
        options={{
          title: "Notifikasi",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Hidden Screens (Face Registration Flow) */}
      <Tabs.Screen
        name="face-registration"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="face-registration-preview"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="face-registration-confirm"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="attendance-camera"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="attendance-preview"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="attendance-success"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  elevatedButtonContainer: {
    top: -14,
    justifyContent: "center",
    alignItems: "center",
  },
  elevatedButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFC81E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#1E1B16",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
