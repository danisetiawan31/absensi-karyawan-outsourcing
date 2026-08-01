import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
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
import { Ionicons } from '@expo/vector-icons';

import KeyboardScreen from '@/components/KeyboardScreen';
import apiClient from '@/services/apiClient';
import { ErrorEnvelope } from '@/types/api';

// Konsisten dengan ChangePasswordDto (MinLength 8) — sudah dikonfirmasi dari backend di Tahap 2
const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  // Gate: kalau tidak ada email param (akses langsung), redirect ke forgot-password.
  // WAJIB di useEffect — navigasi tidak boleh dipanggil saat render (sebelum Root
  // Layout mounting), atau Expo Router lempar "assertIsReady" error.
  useEffect(() => {
    if (!email) {
      router.replace('/(auth)/forgot-password');
    }
  }, [email]);

  if (!email) return null;

  const [token, setToken] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [showPasswordBaru, setShowPasswordBaru] = useState(false);
  const [showKonfirmasi, setShowKonfirmasi] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit() {
    // Validasi client sebelum hit API
    const trimmedToken = token.trim();
    if (!/^\d{6}$/.test(trimmedToken)) {
      setErrorMsg('Kode reset harus berupa 6 digit angka.');
      return;
    }
    if (passwordBaru.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`);
      return;
    }
    if (passwordBaru !== konfirmasiPassword) {
      setErrorMsg('Konfirmasi password tidak sesuai. Pastikan keduanya sama.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      await apiClient.post('/auth/reset-password', {
        email,
        token: trimmedToken,
        passwordBaru,
      });

      // Sukses → redirect ke login (user harus login ulang dengan password baru)
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as ErrorEnvelope | undefined;
        const code = body?.error?.code;

        if (code === 'TOKEN_TIDAK_VALID') {
          // Token invalid/expired — tetap di screen, biarkan user coba ulang input
          setErrorMsg(
            'Kode reset tidak valid atau sudah kedaluwarsa. Silakan cek email Anda atau minta kode baru.',
          );
        } else if (err.response) {
          // Server merespons dengan error selain TOKEN_TIDAK_VALID
          setErrorMsg('Terjadi kesalahan pada server. Silakan coba lagi.');
        } else {
          // Tidak ada respons — network error / timeout
          setErrorMsg('Gagal terhubung ke server. Periksa koneksi internet Anda.');
        }
      } else {
        setErrorMsg('Gagal terhubung ke server. Periksa koneksi internet Anda.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardScreen>
      {/* Header area — konsisten dengan screen auth sebelumnya */}
      <View className="mb-6">
        <Text className="text-[28px] font-sans-extrabold text-foreground tracking-[-0.5px] mb-[6px]">
          Reset Password
        </Text>
        <Text className="text-[15px] font-sans text-muted leading-[22px]">
          Masukkan kode yang dikirim ke{' '}
          <Text className="font-sans-semibold text-foreground">{email}</Text> dan buat
          password baru.
        </Text>
      </View>

      {/* Card form — styling konsisten dengan LoginScreen */}
      <View className="bg-surface rounded-lg border border-solid border-border p-6 gap-5">
        {/* Error banner */}
        {errorMsg && (
          <View className="bg-destructive-bg rounded-md px-[14px] py-[10px]">
            <Text className="text-[13px] font-sans-semibold text-destructive-text leading-[19px]">
              {errorMsg}
            </Text>
          </View>
        )}

        {/* Token field — 1 text field polos, mendukung paste */}
        <View className="gap-[6px]">
          <Text className="text-[13px] font-sans-semibold text-foreground tracking-[0.2px]">
            Kode Reset (6 digit)
          </Text>
          <TextInput
            className="h-[46px] border border-solid border-border rounded-md px-[14px] text-[15px] text-foreground bg-surface focus:outline-none focus:border-primary"
            placeholder="123456"
            placeholderTextColor="#94A3B8"
            value={token}
            onChangeText={(t) => {
              // Hanya izinkan angka, maks 6 karakter
              const digits = t.replace(/\D/g, '').slice(0, 6);
              setToken(digits);
              if (errorMsg) setErrorMsg(null);
            }}
            keyboardType="number-pad"
            returnKeyType="next"
            editable={!isLoading}
            accessibilityLabel="Input kode reset"
          />
          <Text className="text-[12px] font-sans text-muted">
            Cek inbox atau folder spam email Anda. Kode berlaku 15 menit.
          </Text>
        </View>

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
              accessibilityLabel={showPasswordBaru ? 'Sembunyikan password baru' : 'Tampilkan password baru'}
              hitSlop={8}
            >
              <Ionicons
                name={showPasswordBaru ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#64748B"
              />
            </Pressable>
          </View>
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
              accessibilityLabel={showKonfirmasi ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
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
          accessibilityLabel="Tombol reset password"
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#1E1B16" />
          ) : (
            <Text className="text-[15px] font-sans-bold text-on-primary tracking-[0.2px]">
              Reset Password
            </Text>
          )}
        </TouchableOpacity>

        {/* Kembali ke forgot-password */}
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={isLoading}
          className="items-center"
          accessibilityLabel="Kembali ke lupa password"
        >
          <Text className="text-[13px] font-sans-semibold text-muted">
            Minta kode baru
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardScreen>
  );
}
