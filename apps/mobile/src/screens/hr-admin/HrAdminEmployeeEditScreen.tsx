import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AlertBanner } from "@/components/AlertBanner";
import { ErrorState, LoadingState } from "@/components/AsyncStateViews";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SectionCard } from "@/components/SectionCard";
import { COLORS } from "@/constants/theme";
import {
  getEmployees,
  resetFaceRegistration,
  updateEmployee,
} from "@/services/employees.service";
import { UserRole } from "@/types/api";
import { Employee, UpdateEmployeePayload } from "@/types/employee";

// --- Presenter Logic Functions ---

export interface ProcessGeneralUpdateParams {
  id: string;
  nama: string;
  email: string;
  statusAktif: boolean;
  isAnyActionInFlightRef: React.MutableRefObject<boolean>;
  setIsSubmitting: (val: boolean) => void;
  setServerError: (msg: string | null) => void;
  setSuccessBanner: (msg: string | null) => void;
  updateEmployeeFn: (
    id: string,
    data: UpdateEmployeePayload,
  ) => Promise<Employee>;
  invalidateQueriesFn: () => Promise<void> | void;
}

export interface ProcessSubmitResult {
  success: boolean;
  errorMessage?: string;
  isEmailAlreadyTaken?: boolean;
}

export async function processEmployeeGeneralUpdateSubmit(
  params: ProcessGeneralUpdateParams,
): Promise<ProcessSubmitResult> {
  const {
    id,
    nama,
    email,
    statusAktif,
    isAnyActionInFlightRef,
    setIsSubmitting,
    setServerError,
    setSuccessBanner,
    updateEmployeeFn,
    invalidateQueriesFn,
  } = params;

  if (isAnyActionInFlightRef.current) return { success: false };

  const trimmedNama = nama.trim();
  const trimmedEmail = email.trim();

  if (!trimmedNama || !trimmedEmail) {
    const msg = "Nama dan email wajib diisi.";
    setServerError(msg);
    return { success: false, errorMessage: msg };
  }

  isAnyActionInFlightRef.current = true;
  setIsSubmitting(true);
  setServerError(null);
  setSuccessBanner(null);

  try {
    await updateEmployeeFn(id, {
      nama: trimmedNama,
      email: trimmedEmail,
      statusAktif,
    });

    await invalidateQueriesFn();
    setSuccessBanner("Data karyawan berhasil diperbarui.");
    return { success: true };
  } catch (err: unknown) {
    let message = "Gagal memperbarui data karyawan.";
    let isEmailAlreadyTaken = false;

    if (axios.isAxiosError(err)) {
      if (err.response?.status === 409) {
        isEmailAlreadyTaken = true;
        message =
          err.response?.data?.error?.message ||
          "Email sudah terdaftar. Gunakan email lain.";
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
    isAnyActionInFlightRef.current = false;
  }
}

export interface ProcessRoleChangeParams {
  id: string;
  newRole: UserRole;
  isAnyActionInFlightRef: React.MutableRefObject<boolean>;
  setIsSubmitting: (val: boolean) => void;
  setServerError: (msg: string | null) => void;
  setSuccessBanner: (msg: string | null) => void;
  updateEmployeeFn: (
    id: string,
    data: UpdateEmployeePayload,
  ) => Promise<Employee>;
  invalidateQueriesFn: () => Promise<void> | void;
}

export async function processEmployeeRoleChangeSubmit(
  params: ProcessRoleChangeParams,
): Promise<ProcessSubmitResult> {
  const {
    id,
    newRole,
    isAnyActionInFlightRef,
    setIsSubmitting,
    setServerError,
    setSuccessBanner,
    updateEmployeeFn,
    invalidateQueriesFn,
  } = params;

  if (isAnyActionInFlightRef.current) return { success: false };

  isAnyActionInFlightRef.current = true;
  setIsSubmitting(true);
  setServerError(null);
  setSuccessBanner(null);

  try {
    await updateEmployeeFn(id, { role: newRole });
    await invalidateQueriesFn();
    setSuccessBanner(`Role karyawan berhasil diubah menjadi ${newRole}.`);
    return { success: true };
  } catch (err: unknown) {
    let message = "Gagal mengubah role karyawan.";
    if (axios.isAxiosError(err)) {
      message = err.response?.data?.error?.message || message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    setServerError(message);
    return { success: false, errorMessage: message };
  } finally {
    setIsSubmitting(false);
    isAnyActionInFlightRef.current = false;
  }
}

export interface ProcessResetFaceParams {
  id: string;
  isAnyActionInFlightRef: React.MutableRefObject<boolean>;
  setIsSubmitting: (val: boolean) => void;
  setServerError: (msg: string | null) => void;
  setSuccessBanner: (msg: string | null) => void;
  resetFaceRegistrationFn: (id: string) => Promise<{ success: boolean }>;
  invalidateQueriesFn: () => Promise<void> | void;
}

export async function processEmployeeResetFaceSubmit(
  params: ProcessResetFaceParams,
): Promise<ProcessSubmitResult> {
  const {
    id,
    isAnyActionInFlightRef,
    setIsSubmitting,
    setServerError,
    setSuccessBanner,
    resetFaceRegistrationFn,
    invalidateQueriesFn,
  } = params;

  if (isAnyActionInFlightRef.current) return { success: false };

  isAnyActionInFlightRef.current = true;
  setIsSubmitting(true);
  setServerError(null);
  setSuccessBanner(null);

  try {
    await resetFaceRegistrationFn(id);
    await invalidateQueriesFn();
    setSuccessBanner("Registrasi wajah karyawan berhasil Direset.");
    return { success: true };
  } catch (err: unknown) {
    let message = "Gagal mereset registrasi wajah.";
    if (axios.isAxiosError(err)) {
      message = err.response?.data?.error?.message || message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    setServerError(message);
    return { success: false, errorMessage: message };
  } finally {
    setIsSubmitting(false);
    isAnyActionInFlightRef.current = false;
  }
}

// --- Component ---

export default function HrAdminEmployeeEditScreen() {
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isAnyActionInFlightRef = useRef(false);

  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [statusAktif, setStatusAktif] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>("KARYAWAN");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [showRoleConfirmModal, setShowRoleConfirmModal] = useState(false);
  const [showResetFaceModal, setShowResetFaceModal] = useState(false);

  // Fetch existing employee list & find matching ID
  const {
    data: employees = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["employees"],
    queryFn: () => getEmployees({}),
  });

  const employee = employees.find((item) => item.id === id);

  useEffect(() => {
    if (employee) {
      setNama(employee.nama);
      setEmail(employee.email);
      setStatusAktif(employee.statusAktif);
      setSelectedRole(employee.role);
    }
  }, [employee]);

  const handleGeneralSubmit = () => {
    if (!id) return;
    processEmployeeGeneralUpdateSubmit({
      id,
      nama,
      email,
      statusAktif,
      isAnyActionInFlightRef,
      setIsSubmitting,
      setServerError,
      setSuccessBanner,
      updateEmployeeFn: updateEmployee,
      invalidateQueriesFn: () =>
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
    });
  };

  const handleRoleChangeConfirm = () => {
    if (!id) return;
    setShowRoleConfirmModal(false);
    processEmployeeRoleChangeSubmit({
      id,
      newRole: selectedRole,
      isAnyActionInFlightRef,
      setIsSubmitting,
      setServerError,
      setSuccessBanner,
      updateEmployeeFn: updateEmployee,
      invalidateQueriesFn: () =>
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
    });
  };

  const handleResetFaceConfirm = () => {
    if (!id) return;
    setShowResetFaceModal(false);
    processEmployeeResetFaceSubmit({
      id,
      isAnyActionInFlightRef,
      setIsSubmitting,
      setServerError,
      setSuccessBanner,
      resetFaceRegistrationFn: resetFaceRegistration,
      invalidateQueriesFn: () =>
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50">
        <ScreenHeader
          title="Edit Karyawan"
          subtitle="Memuat data karyawan..."
        />
        <LoadingState message="Memuat data karyawan..." />
      </View>
    );
  }

  if (isError || !employee) {
    return (
      <View className="flex-1 bg-slate-50">
        <ScreenHeader title="Edit Karyawan" subtitle="Gagal memuat data" />
        <View className="p-4">
          <ErrorState
            title="Karyawan Tidak Ditemukan"
            message="Data karyawan tidak dapat ditemukan atau gagal dimuat dari server."
            onRetry={refetch}
          />
        </View>
      </View>
    );
  }

  const isRoleChanged = selectedRole !== employee.role;

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Edit Karyawan"
        subtitle={`Kelola data & role untuk ${employee.nama}`}
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Banners */}
        {serverError && (
          <AlertBanner
            type="error"
            message={serverError}
            testID="banner-edit-error"
          />
        )}
        {successBanner && (
          <AlertBanner
            type="success"
            message={successBanner}
            testID="banner-edit-success"
          />
        )}

        {/* Section 1: Form Field Biasa */}
        <SectionCard className="p-4 gap-4 mb-4">
          <Text className="font-sans-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
            Informasi Profil & Status
          </Text>

          {/* Nama */}
          <View>
            <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
              Nama Lengkap <Text className="text-rose-500">*</Text>
            </Text>
            <TextInput
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
              value={nama}
              onChangeText={setNama}
              testID="input-edit-nama"
            />
          </View>

          {/* Email */}
          <View>
            <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
              Alamat Email <Text className="text-rose-500">*</Text>
            </Text>
            <TextInput
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              testID="input-edit-email"
            />
          </View>

          {/* Status Aktif Selector */}
          <View>
            <Text className="font-sans-semibold text-xs text-slate-700 mb-1.5">
              Status Akun <Text className="text-rose-500">*</Text>
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                  statusAktif
                    ? "bg-emerald-50 border-emerald-300"
                    : "bg-slate-50 border-slate-200"
                }`}
                onPress={() => setStatusAktif(true)}
                disabled={isSubmitting}
                testID="status-chip-aktif"
              >
                <Text
                  className={`font-sans-bold text-xs ${
                    statusAktif ? "text-emerald-700" : "text-slate-600"
                  }`}
                >
                  Aktif
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                  !statusAktif
                    ? "bg-slate-200 border-slate-300"
                    : "bg-slate-50 border-slate-200"
                }`}
                onPress={() => setStatusAktif(false)}
                disabled={isSubmitting}
                testID="status-chip-nonaktif"
              >
                <Text
                  className={`font-sans-bold text-xs ${
                    !statusAktif ? "text-slate-800" : "text-slate-600"
                  }`}
                >
                  Nonaktif
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit General Fields */}
          <TouchableOpacity
            className={`py-3 rounded-xl bg-amber-400 items-center justify-center ${
              isSubmitting ? "opacity-50" : "active:bg-amber-500"
            }`}
            onPress={handleGeneralSubmit}
            disabled={isSubmitting}
            testID="button-submit-general-edit"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#1E1B16" />
            ) : (
              <Text className="font-sans-bold text-xs text-slate-900">
                Simpan Perubahan Data
              </Text>
            )}
          </TouchableOpacity>
        </SectionCard>

        {/* Section 2: Role Change */}
        <SectionCard className="p-4 gap-3 mb-4">
          <Text className="font-sans-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
            Role Akses Pengguna
          </Text>
          <Text className="font-sans text-xs text-slate-500">
            Role saat ini:{" "}
            <Text className="font-sans-bold text-slate-900">
              {employee.role}
            </Text>
          </Text>

          <View className="flex-row gap-2 my-1">
            {(
              [
                { label: "Karyawan", value: "KARYAWAN" },
                { label: "Supervisor", value: "SUPERVISOR" },
                { label: "HR Admin", value: "HR_ADMIN" },
              ] as const
            ).map((chip) => {
              const isActive = selectedRole === chip.value;
              return (
                <TouchableOpacity
                  key={chip.value}
                  className={`flex-1 py-2 px-1 rounded-xl border items-center justify-center ${
                    isActive
                      ? "bg-amber-100 border-amber-400"
                      : "bg-slate-50 border-slate-200"
                  }`}
                  onPress={() => setSelectedRole(chip.value)}
                  disabled={isSubmitting}
                  testID={`edit-role-chip-${chip.value}`}
                >
                  <Text
                    className={`font-sans-bold text-xs ${
                      isActive ? "text-slate-900" : "text-slate-600"
                    }`}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isRoleChanged && (
            <TouchableOpacity
              className={`py-2.5 rounded-xl bg-amber-400 items-center justify-center ${
                isSubmitting ? "opacity-50" : "active:bg-amber-500"
              }`}
              onPress={() => setShowRoleConfirmModal(true)}
              disabled={isSubmitting}
              testID="button-submit-role-change"
            >
              <Text className="font-sans-bold text-xs text-slate-900">
                Ubah Role Menjadi {selectedRole}
              </Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* Section 3: Reset Face Registration */}
        <SectionCard className="p-4 gap-3">
          <Text className="font-sans-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
            Registrasi Wajah
          </Text>
          <Text className="font-sans text-xs text-slate-500 leading-5">
            Status:{" "}
            {employee.wajahTerdaftar ? "Sudah Terdaftar" : "Belum Terdaftar"}.
            Reset registrasi wajah jika karyawan mengganti perangkat atau butuh
            mendaftarkan ulang foto wajahnya.
          </Text>

          <TouchableOpacity
            className={`py-2.5 rounded-xl border border-rose-300 bg-rose-50 items-center justify-center flex-row gap-1.5 ${
              isSubmitting ? "opacity-50" : "active:bg-rose-100"
            }`}
            onPress={() => setShowResetFaceModal(true)}
            disabled={isSubmitting}
            testID="button-reset-face-trigger"
          >
            <Ionicons name="refresh-circle-outline" size={18} color="#E11D48" />
            <Text className="font-sans-bold text-xs text-rose-700">
              Reset Registrasi Wajah
            </Text>
          </TouchableOpacity>
        </SectionCard>
      </ScrollView>

      {/* Confirm Modal: Role Change */}
      {showRoleConfirmModal && (
        <ConfirmModal
          visible={showRoleConfirmModal}
          variant="warning"
          title="Konfirmasi Perubahan Role"
          description={`Apakah Anda yakin ingin mengubah role "${employee.nama}" dari ${employee.role} menjadi ${selectedRole}?`}
          confirmText="Ubah Role"
          cancelText="Batal"
          onConfirm={handleRoleChangeConfirm}
          onCancel={() => setShowRoleConfirmModal(false)}
          testID="modal-confirm-role-change"
        />
      )}

      {/* Confirm Modal: Reset Face Registration */}
      {showResetFaceModal && (
        <ConfirmModal
          visible={showResetFaceModal}
          variant="warning"
          title="Konfirmasi Reset Registrasi Wajah"
          description="Karyawan wajib registrasi ulang wajah saat app dibuka berikutnya. Tidak ada notifikasi otomatis ke karyawan."
          confirmText="Reset Wajah"
          cancelText="Batal"
          onConfirm={handleResetFaceConfirm}
          onCancel={() => setShowResetFaceModal(false)}
          testID="modal-confirm-reset-face"
        />
      )}
    </View>
  );
}
