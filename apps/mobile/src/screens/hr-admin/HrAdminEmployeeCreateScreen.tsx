import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { COLORS } from '@/constants/theme';
import { createEmployee } from '@/services/employees.service';
import { UserRole } from '@/types/api';
import { CreateEmployeeResponse } from '@/types/employee';

export type RouterPushFn = (opt: Parameters<typeof router.push>[0]) => void;

export interface ProcessEmployeeCreateSubmitParams {
  nama: string;
  email: string;
  role: UserRole | string;
  isSubmittingRef: React.MutableRefObject<boolean>;
  setIsSubmitting: (val: boolean) => void;
  setServerError: (msg: string | null) => void;
  createEmployeeFn: (payload: {
    nama: string;
    email: string;
    role: UserRole | string;
  }) => Promise<CreateEmployeeResponse>;
  routerPush: RouterPushFn;
}

export interface ProcessEmployeeCreateSubmitResult {
  success: boolean;
  errorMessage?: string;
  isEmailAlreadyTaken?: boolean;
}

export async function processEmployeeCreateSubmit(
  params: ProcessEmployeeCreateSubmitParams,
): Promise<ProcessEmployeeCreateSubmitResult> {
  const {
    nama,
    email,
    role,
    isSubmittingRef,
    setIsSubmitting,
    setServerError,
    createEmployeeFn,
    routerPush,
  } = params;

  if (isSubmittingRef.current) return { success: false };

  const trimmedNama = nama.trim();
  const trimmedEmail = email.trim();

  if (!trimmedNama || !trimmedEmail) {
    const msg = 'Nama dan email wajib diisi.';
    setServerError(msg);
    return { success: false, errorMessage: msg };
  }

  isSubmittingRef.current = true;
  setIsSubmitting(true);
  setServerError(null);

  try {
    const res = await createEmployeeFn({
      nama: trimmedNama,
      email: trimmedEmail,
      role,
    });

    routerPush({
      pathname: '/(hr-admin)/employee-password-reveal',
      params: {
        nama: res.nama,
        passwordSementara: res.passwordSementara,
      },
    } as unknown as Parameters<typeof router.push>[0]);

    return { success: true };
  } catch (err: unknown) {
    let message = 'Gagal membuat karyawan baru. Silakan coba lagi.';
    let isEmailAlreadyTaken = false;

    if (axios.isAxiosError(err)) {
      if (err.response?.status === 409) {
        isEmailAlreadyTaken = true;
        message =
          err.response?.data?.error?.message ||
          'Email sudah terdaftar. Gunakan email lain.';
      } else {
        message = err.response?.data?.error?.message || message;
      }
    } else if (err instanceof Error) {
      message = err.message;
    }

    setServerError(message);
    return { success: false, errorMessage: message, isEmailAlreadyTaken };
  } finally {
    setIsSubmitting(false);
    isSubmittingRef.current = false;
  }
}

export default function HrAdminEmployeeCreateScreen() {
  const isSubmittingRef = useRef(false);

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('KARYAWAN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = () => {
    processEmployeeCreateSubmit({
      nama,
      email,
      role,
      isSubmittingRef,
      setIsSubmitting,
      setServerError,
      createEmployeeFn: createEmployee,
      routerPush: router.push,
    });
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Tambah Karyawan Baru"
        subtitle="Buat akun user untuk karyawan, supervisor, atau HR admin"
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {serverError && (
          <View className="mb-4">
            <AlertBanner
              type="error"
              message={serverError}
              testID="banner-create-error"
            />
          </View>
        )}

        <SectionCard className="p-4 gap-4">
          {/* Field Nama */}
          <View>
            <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
              Nama Lengkap <Text className="text-rose-500">*</Text>
            </Text>
            <TextInput
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
              placeholder="Masukkan nama lengkap..."
              placeholderTextColor={COLORS.muted}
              value={nama}
              onChangeText={setNama}
              testID="input-nama"
            />
          </View>

          {/* Field Email */}
          <View>
            <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
              Alamat Email <Text className="text-rose-500">*</Text>
            </Text>
            <TextInput
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
              placeholder="contoh: budi@perusahaan.com"
              placeholderTextColor={COLORS.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              testID="input-email"
            />
          </View>

          {/* Selector Role */}
          <View>
            <Text className="font-sans-semibold text-xs text-slate-700 mb-2">
              Role Akses <Text className="text-rose-500">*</Text>
            </Text>
            <View className="flex-row gap-2">
              {(
                [
                  { label: 'Karyawan', value: 'KARYAWAN' },
                  { label: 'Supervisor', value: 'SUPERVISOR' },
                  { label: 'HR Admin', value: 'HR_ADMIN' },
                ] as const
              ).map((chip) => {
                const isActive = role === chip.value;
                return (
                  <TouchableOpacity
                    key={chip.value}
                    className={`flex-1 py-2.5 px-2 rounded-xl border items-center justify-center ${
                      isActive
                        ? 'bg-amber-100 border-amber-400'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                    onPress={() => setRole(chip.value)}
                    testID={`role-chip-${chip.value}`}
                  >
                    <Text
                      className={`font-sans-bold text-xs ${
                        isActive ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Submit */}
          <TouchableOpacity
            className={`mt-4 py-3 rounded-xl bg-amber-400 items-center justify-center ${
              isSubmitting ? 'opacity-50' : 'active:bg-amber-500'
            }`}
            onPress={handleSubmit}
            disabled={isSubmitting}
            testID="button-submit-create"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#1E1B16" />
            ) : (
              <Text className="font-sans-bold text-sm text-slate-900">
                Buat Karyawan
              </Text>
            )}
          </TouchableOpacity>
        </SectionCard>
      </ScrollView>
    </View>
  );
}
