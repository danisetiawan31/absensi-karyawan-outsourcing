import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import KeyboardScreen from '@/components/KeyboardScreen';
import apiClient from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import { ErrorEnvelope, UserRole } from '@/types/api';

// Angka ini sesuai DTO backend aktual (change-password.dto.ts → MinLength(8))
// dan konsisten dengan reset-password.dto.ts
const MIN_PASSWORD_LENGTH = 8;

const ROLE_ROUTES: Record<UserRole, string> = {
  KARYAWAN: '/(karyawan)/index',
  SUPERVISOR: '/(supervisor)/index',
  HR_ADMIN: '/(hr-admin)/index',
};

export default function ChangePasswordRequiredScreen() {
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [showPasswordBaru, setShowPasswordBaru] = useState(false);
  const [showKonfirmasi, setShowKonfirmasi] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pendingPasswordLama = useAuthStore((s) => s.pendingPasswordLama);
  const clearPendingPasswordLama = useAuthStore(
    (s) => s.clearPendingPasswordLama,
  );
  const role = useAuthStore((s) => s.role);

  // Gate: kalau tidak datang dari Login flow yang benar, paksa redirect ke Login.
  // WAJIB di useEffect — navigasi tidak boleh dipanggil saat render (sebelum Root
  // Layout mounting), atau Expo Router lempar "assertIsReady" error.
  useEffect(() => {
    if (!pendingPasswordLama) {
      router.replace('/(auth)/login');
    }
  }, [pendingPasswordLama]);

  if (!pendingPasswordLama) return null;

  async function handleSubmit() {
    // Validasi client dulu sebelum hit API
    if (passwordBaru.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(
        `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`,
      );
      return;
    }
    if (passwordBaru !== konfirmasiPassword) {
      setErrorMsg('Konfirmasi password tidak sesuai. Pastikan keduanya sama.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      await apiClient.post('/auth/change-password', {
        passwordLama: pendingPasswordLama,
        passwordBaru,
      });

      // Sukses: clear state transient SEGERA, lalu redirect ke dashboard
      clearPendingPasswordLama();
      router.replace(ROLE_ROUTES[role!] as never);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as ErrorEnvelope | undefined;
        const code = body?.error?.code;

        if (code === 'PASSWORD_LAMA_SALAH') {
          // Tidak clear pendingPasswordLama agar user bisa retry
          setErrorMsg(
            'Terjadi kesalahan saat verifikasi. Silakan coba lagi atau login ulang.',
          );
        } else {
          setErrorMsg('Terjadi kesalahan. Periksa koneksi internet Anda.');
        }
      } else {
        setErrorMsg('Terjadi kesalahan. Periksa koneksi internet Anda.');
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
          Ganti Password
        </Text>
        <Text className="text-[15px] font-sans text-muted leading-[22px]">
          Akun Anda membutuhkan password baru sebelum dapat digunakan.
        </Text>
      </View>

      {/* Card form — styling persis LoginScreen */}
      <View className="bg-surface rounded-lg border border-solid border-border p-6 gap-5">
        {/* Error banner */}
        {errorMsg && (
          <View className="bg-destructive-bg rounded-md px-[14px] py-[10px]">
            <Text className="text-[13px] font-sans-semibold text-destructive-text leading-[19px]">
              {errorMsg}
            </Text>
          </View>
        )}

        {/* Password baru field */}
        <View className="gap-[6px]">
          <Text className="text-[13px] font-sans-semibold text-foreground tracking-[0.2px]">
            Password Baru
          </Text>
          <View className="relative">
            <TextInput
              className="h-[46px] border border-solid border-border rounded-md pl-[14px] pr-[44px] text-[15px] text-foreground bg-surface focus:outline-none focus:border-primary"
              placeholder="Masukkan password baru"
              placeholderTextColor="#94A3B8"
              value={passwordBaru}
              onChangeText={(t) => {
                setPasswordBaru(t);
                if (errorMsg) setErrorMsg(null);
              }}
              secureTextEntry={!showPasswordBaru}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType={Platform.OS === 'ios' ? 'next' : 'done'}
              editable={!isLoading}
              accessibilityLabel="Input password baru"
            />
            <Pressable
              className="absolute right-3 top-0 bottom-0 justify-center"
              onPress={() => setShowPasswordBaru((v) => !v)}
              accessibilityLabel={
                showPasswordBaru
                  ? 'Sembunyikan password baru'
                  : 'Tampilkan password baru'
              }
              hitSlop={8}
            >
              <Ionicons
                name={showPasswordBaru ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#64748B"
              />
            </Pressable>
          </View>
          {/* Teks requirement statis — bukan strength meter */}
          <Text className="text-[12px] font-sans text-muted">
            Minimal {MIN_PASSWORD_LENGTH} karakter
          </Text>
        </View>

        {/* Konfirmasi password field */}
        <View className="gap-[6px]">
          <Text className="text-[13px] font-sans-semibold text-foreground tracking-[0.2px]">
            Konfirmasi Password Baru
          </Text>
          <View className="relative">
            <TextInput
              className="h-[46px] border border-solid border-border rounded-md pl-[14px] pr-[44px] text-[15px] text-foreground bg-surface focus:outline-none focus:border-primary"
              placeholder="Ulangi password baru"
              placeholderTextColor="#94A3B8"
              value={konfirmasiPassword}
              onChangeText={(t) => {
                setKonfirmasiPassword(t);
                if (errorMsg) setErrorMsg(null);
              }}
              secureTextEntry={!showKonfirmasi}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!isLoading}
              accessibilityLabel="Input konfirmasi password"
            />
            <Pressable
              className="absolute right-3 top-0 bottom-0 justify-center"
              onPress={() => setShowKonfirmasi((v) => !v)}
              accessibilityLabel={
                showKonfirmasi
                  ? 'Sembunyikan konfirmasi password'
                  : 'Tampilkan konfirmasi password'
              }
              hitSlop={8}
            >
              <Ionicons
                name={showKonfirmasi ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#64748B"
              />
            </Pressable>
          </View>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          className={`h-[48px] bg-primary rounded-md items-center justify-center mt-1 ${isLoading ? 'opacity-60' : ''}`}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.82}
          accessibilityLabel="Tombol simpan password"
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#1E1B16" />
          ) : (
            <Text className="text-[15px] font-sans-bold text-on-primary tracking-[0.2px]">
              Simpan Password
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardScreen>
  );
}
