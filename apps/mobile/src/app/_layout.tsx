import "../global.css";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";

import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/types/api";

SplashScreen.preventAutoHideAsync();

const VALID_ROLES: UserRole[] = ["KARYAWAN", "SUPERVISOR", "HR_ADMIN"];

const ROLE_ROUTES = {
  KARYAWAN: "/(karyawan)" as const,
  SUPERVISOR: "/(supervisor)" as const,
  HR_ADMIN: "/(hr-admin)" as const,
} satisfies Record<UserRole, string>;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Use selectors to prevent unnecessary re-renders
  const hydrateAuth = useAuthStore((s) => s.hydrateAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const role = useAuthStore((s) => s.role);

  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({
    "PlusJakartaSans-Regular": require("../../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakartaSans-SemiBold": require("../../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "PlusJakartaSans-Bold": require("../../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "PlusJakartaSans-ExtraBold": require("../../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
  });

  useEffect(() => {
    async function initAuth() {
      try {
        await hydrateAuth();
      } finally {
        setIsCheckingAuth(false);
      }
    }
    initAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    if (isCheckingAuth || (!fontsLoaded && !fontError)) return;
    
    // Now layout is mounted, auth is checked, and fonts are loaded.
    const inAuthGroup = segments[0] === "(auth)";

    if (!role || !VALID_ROLES.includes(role)) {
      if (!inAuthGroup) {
        // Clear corrupt state (if any) and redirect to login
        clearAuth().then(() => router.replace("/(auth)/login"));
      }
    } else {
      // If user is authenticated and trying to access auth screens (or root), redirect to their dashboard
      if (inAuthGroup || !segments[0]) {
        router.replace(ROLE_ROUTES[role] as never);
      }
    }
  }, [isCheckingAuth, fontsLoaded, fontError, role, segments, clearAuth]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && !isCheckingAuth) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isCheckingAuth]);

  // Always render the navigator (Stack) to satisfy Expo Router's strict mounting requirements.
  // The SplashScreen prevents the user from seeing any intermediate states.
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
