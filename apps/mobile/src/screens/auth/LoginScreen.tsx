import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router } from 'expo-router';
import { useState } from 'react';
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
import { ErrorEnvelope, SuccessEnvelope, UserRole } from '@/types/api';

// Reuse role-routing logic yang sudah ada di root layout — tidak duplikasi
const ROLE_ROUTES: Record<UserRole, string> = {
  KARYAWAN: '/(karyawan)/index',
  SUPERVISOR: '/(supervisor)/index',
  HR_ADMIN: '/(hr-admin)/index',
};

interface LoginResponseData {
  accessToken: string;
  role: UserRole;
  userId: string;
  nama: string;
  wajahTerdaftar: boolean;
  wajibGantiPassword: boolean;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { setAuth, setPendingPasswordLama } = useAuthStore();

  async function handleSubmit() {
    // Client-side validation dulu sebelum hit API
    if (!email.trim()) {
      setErrorMsg('Email wajib diisi.');
      return;
    }
    if (!validateEmail(email)) {
      setErrorMsg('Format email tidak valid.');
      return;
    }
    if (!password) {
      setErrorMsg('Password wajib diisi.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post<SuccessEnvelope<LoginResponseData>>(
        '/auth/login',
        { email: email.trim(), password }
      );

      const data = response.data.data;

      // Simpan sesi ke store + SecureStore
      await setAuth({
        accessToken: data.accessToken,
        role: data.role,
        userId: data.userId,
        nama: data.nama,
        wajahTerdaftar: data.wajahTerdaftar,
        wajibGantiPassword: data.wajibGantiPassword,
      });

      if (data.wajibGantiPassword) {
        // Simpan password lama secara in-memory (transient) untuk dipakai di screen berikutnya
        setPendingPasswordLama(password);
        router.replace('/(auth)/change-password-required');
      } else {
        router.replace(ROLE_ROUTES[data.role] as never);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as ErrorEnvelope | undefined;
        const code = body?.error?.code;

        if (code === 'AKUN_NONAKTIF') {
          setErrorMsg(
            'Akun Anda telah dinonaktifkan. Hubungi HR untuk informasi lebih lanjut.'
          );
        } else {
          setErrorMsg('Email atau password salah. Silakan periksa kembali.');
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
        {/* Header area */}
        <View className="mb-6">
          <Text className="text-[28px] font-sans-extrabold text-foreground tracking-[-0.5px] mb-[6px]">Masuk</Text>
          <Text className="text-[15px] font-sans text-muted leading-[22px]">
            Masukkan akun Anda untuk melanjutkan
          </Text>
        </View>

        {/* Card form */}
        <View className="bg-surface rounded-lg border border-solid border-border p-6 gap-5">
          {/* Error banner */}
          {errorMsg && (
            <View className="bg-destructive-bg rounded-md px-[14px] py-[10px]">
              <Text className="text-[13px] font-sans-semibold text-destructive-text leading-[19px]">{errorMsg}</Text>
            </View>
          )}

          {/* Email field */}
          <View className="gap-[6px]">
            <Text className="text-[13px] font-sans-semibold text-foreground tracking-[0.2px]">Email</Text>
            <TextInput
              className={`h-[46px] border border-solid rounded-md px-[14px] text-[15px] text-foreground bg-surface focus:outline-none focus:border-primary ${errorMsg !== null && email === '' ? 'border-destructive focus:border-destructive' : 'border-border'}`}
              placeholder="nama@perusahaan.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errorMsg) setErrorMsg(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              editable={!isLoading}
              accessibilityLabel="Input email"
            />
          </View>

          {/* Password field */}
          <View className="gap-[6px]">
            <Text className="text-[13px] font-sans-semibold text-foreground tracking-[0.2px]">Password</Text>
            <View className="relative">
              <TextInput
                className="h-[46px] border border-solid border-border rounded-md pl-[14px] pr-[44px] text-[15px] text-foreground bg-surface focus:outline-none focus:border-primary"
                placeholder="Masukkan password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMsg) setErrorMsg(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                editable={!isLoading}
                accessibilityLabel="Input password"
              />
              <Pressable
                className="absolute right-3 top-0 bottom-0 justify-center"
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
              </Pressable>
            </View>
          </View>

          {/* Lupa password link */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            className="self-end mt-[-8px]"
            disabled={isLoading}
            accessibilityLabel="Lupa password"
          >
            <Text className="text-[13px] font-sans-semibold text-muted">Lupa password?</Text>
          </TouchableOpacity>

          {/* Submit button */}
          <TouchableOpacity
            className={`h-[48px] bg-primary rounded-md items-center justify-center mt-1 ${isLoading ? 'opacity-60' : ''}`}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.82}
            accessibilityLabel="Tombol masuk"
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#1E1B16" />
            ) : (
              <Text className="text-[15px] font-sans-bold text-on-primary tracking-[0.2px]">Masuk</Text>
            )}
          </TouchableOpacity>
        </View>
    </KeyboardScreen>
  );
}
