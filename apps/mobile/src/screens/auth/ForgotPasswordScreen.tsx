import axios from "axios";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import KeyboardScreen from "@/components/KeyboardScreen";
import apiClient from "@/services/apiClient";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  // Error teknis (network/timeout/5xx) — ditampilkan sbg banner, biarkan user retry
  const [networkError, setNetworkError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) {
      setEmailError("Email wajib diisi.");
      return;
    }
    if (!validateEmail(email)) {
      setEmailError("Format email tidak valid.");
      return;
    }

    setEmailError(null);
    setNetworkError(null);
    setIsLoading(true);

    try {
      await apiClient.post("/auth/forgot-password", { email: email.trim() });

      // Server merespons sukses (200) → redirect ke reset-password.
      // Anti-enumeration berlaku di sini: server SELALU 200 terlepas apakah
      // email terdaftar atau tidak — kita tidak perlu bedakan kondisinya.
      router.push({
        pathname: "/(auth)/reset-password",
        params: { email: email.trim() },
      });
    } catch (err: unknown) {
      // Network error / timeout / 5xx — request tidak sampai server atau server crash.
      // Ini BEDA dari anti-enumeration (yang soal server tidak bocorkan status email).
      // Kegagalan teknis harus ditampilkan jelas agar user bisa retry.
      const isAxios = axios.isAxiosError(err);
      if (isAxios && err.response) {
        // Server merespons dengan error (mis. 5xx) — jarang terjadi karena
        // /auth/forgot-password dirancang selalu 200, tapi antisipasi tetap perlu
        setNetworkError("Terjadi kesalahan pada server. Silakan coba lagi.");
      } else {
        // Tidak ada respons sama sekali — network error / timeout
        setNetworkError(
          "Gagal terhubung ke server. Periksa koneksi internet Anda.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardScreen>
      {/* Header area — konsisten dengan LoginScreen */}
      <View className="mb-6">
        <Text className="text-[28px] font-sans-extrabold text-foreground tracking-[-0.5px] mb-[6px]">
          Lupa Password
        </Text>
        <Text className="text-[15px] font-sans text-muted leading-[22px]">
          Masukkan email Anda dan kami akan mengirimkan kode reset password.
        </Text>
      </View>

      {/* Card form — styling konsisten dengan LoginScreen & ChangePasswordRequiredScreen */}
      <View className="bg-surface rounded-lg border border-solid border-border p-6 gap-5">
        {/* Error banner validasi email — sama seperti LoginScreen */}
        {emailError && (
          <View className="bg-destructive-bg rounded-md px-[14px] py-[10px]">
            <Text className="text-[13px] font-sans-semibold text-destructive-text leading-[19px]">
              {emailError}
            </Text>
          </View>
        )}

        {/* Error banner kegagalan teknis (network/timeout/5xx) — biarkan user retry */}
        {networkError && (
          <View className="bg-destructive-bg rounded-md px-[14px] py-[10px]">
            <Text className="text-[13px] font-sans-semibold text-destructive-text leading-[19px]">
              {networkError}
            </Text>
          </View>
        )}

        {/* Email field */}
        <View className="gap-[6px]">
          <Text className="text-[13px] font-sans-semibold text-foreground tracking-[0.2px]">
            Email
          </Text>
          <TextInput
            className={`h-[46px] border border-solid rounded-md px-[14px] text-[15px] text-foreground bg-surface focus:outline-none focus:border-primary ${emailError ? "border-destructive focus:border-destructive" : "border-border"}`}
            placeholder="nama@perusahaan.com"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (emailError) setEmailError(null);
              if (networkError) setNetworkError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!isLoading}
            accessibilityLabel="Input email"
          />
        </View>

        {/* Submit button */}
        <TouchableOpacity
          className={`h-[48px] bg-primary rounded-md items-center justify-center mt-1 ${isLoading ? "opacity-60" : ""}`}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.82}
          accessibilityLabel="Tombol kirim kode reset"
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#1E1B16" />
          ) : (
            <Text className="text-[15px] font-sans-bold text-on-primary tracking-[0.2px]">
              Kirim Kode Reset
            </Text>
          )}
        </TouchableOpacity>

        {/* Kembali ke Login */}
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={isLoading}
          className="items-center"
          accessibilityLabel="Kembali ke halaman login"
        >
          <Text className="text-[13px] font-sans-semibold text-muted">
            Kembali ke Login
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardScreen>
  );
}
