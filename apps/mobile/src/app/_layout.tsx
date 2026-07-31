import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";

import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/types/api";

SplashScreen.preventAutoHideAsync();

const VALID_ROLES: UserRole[] = ["KARYAWAN", "SUPERVISOR", "HR_ADMIN"];

const ROLE_ROUTES = {
  KARYAWAN: "/(karyawan)/index" as const,
  SUPERVISOR: "/(supervisor)/index" as const,
  HR_ADMIN: "/(hr-admin)/index" as const,
} satisfies Record<UserRole, string>;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { hydrateAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    async function checkAuth() {
      try {
        const isHydrated = await hydrateAuth();

        if (!isHydrated) {
          router.replace("/(auth)/login");
          return;
        }

        const { role } = useAuthStore.getState();

        if (!role || !VALID_ROLES.includes(role)) {
          // Edge case: role tidak valid atau korup (mismatch)
          // Panggil clearAuth secara eksplisit untuk menghapus token zombie
          await clearAuth();
          router.replace("/(auth)/login");
          return;
        }

        router.replace(ROLE_ROUTES[role]);
      } catch {
        // Unexpected error saat cek auth
        router.replace("/(auth)/login");
      } finally {
        setIsCheckingAuth(false);
        SplashScreen.hideAsync();
      }
    }

    checkAuth();
  }, []);

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
