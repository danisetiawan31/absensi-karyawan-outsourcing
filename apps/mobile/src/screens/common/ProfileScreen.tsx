import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AlertBanner } from "@/components/AlertBanner";
import { ConfirmModal } from "@/components/ConfirmModal";
import { SectionCard } from "@/components/SectionCard";
import { COLORS } from "@/constants/theme";
import { changePassword } from "@/services/auth.service";
import { getSupervisorSites } from "@/services/supervisor-sites.service";
import { useAuthStore } from "@/store/authStore";
import { ErrorEnvelope } from "@/types/api";

export function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function getRoleBadgeLabel(role?: string | null): string {
  if (role === "KARYAWAN") return "KARYAWAN LAPANGAN";
  if (role === "SUPERVISOR") return "SUPERVISOR";
  if (role === "HR_ADMIN") return "HR ADMIN";
  return "PENGGUNA";
}

export default function ProfileScreen() {
  const { nama, email, role, clearAuth } = useAuthStore();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Form Change Password State
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasiPasswordBaru, setKonfirmasiPasswordBaru] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Fetch Supervisor Sites (only when SUPERVISOR)
  const { data: supervisorSites = [], isLoading: isLoadingSites } = useQuery({
    queryKey: ["supervisor-sites"],
    queryFn: () => getSupervisorSites(),
    enabled: role === "SUPERVISOR",
  });

  const handleLogout = async () => {
    setIsLogoutModalOpen(false);
    await clearAuth();
    router.replace("/(auth)/login");
  };

  const handleChangePasswordSubmit = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordLama.trim()) {
      setPasswordError("Password saat ini wajib diisi.");
      return;
    }
    if (!passwordBaru || passwordBaru.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }
    if (passwordBaru !== konfirmasiPasswordBaru) {
      setPasswordError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setIsSubmittingPassword(true);

    try {
      await changePassword({
        passwordLama: passwordLama.trim(),
        passwordBaru: passwordBaru.trim(),
      });
      setPasswordSuccess("Password berhasil diperbarui.");
      setPasswordLama("");
      setPasswordBaru("");
      setKonfirmasiPasswordBaru("");
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      let msg = "Gagal memperbarui password.";
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as ErrorEnvelope | undefined;
        if (body?.error?.code === "PASSWORD_LAMA_SALAH") {
          msg = "Password saat ini salah.";
        } else if (body?.error?.message) {
          msg = body.error.message;
        }
      }
      setPasswordError(msg);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const initials = getInitials(nama);
  const roleLabel = getRoleBadgeLabel(role);

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header Banner Kuning Aksen */}
      <View className="bg-amber-400 pt-12 pb-3.5 px-4 flex-row items-center justify-between shadow-sm">
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center rounded-full active:bg-amber-500/20"
          onPress={() => router.back()}
          testID="button-back-profile"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="font-sans-bold text-lg text-slate-900 flex-1 text-center pr-10">
          Profil
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* User Identity Header Card */}
        <View className="items-center mb-6">
          {/* Yellow Initial Circle */}
          <View className="w-24 h-24 rounded-full bg-amber-400 items-center justify-center mb-3 shadow-md border-4 border-white">
            <Text className="font-sans-bold text-3xl text-slate-900">
              {initials}
            </Text>
          </View>

          {/* User Name & Email */}
          <Text className="font-sans-bold text-xl text-slate-900 text-center mb-0.5">
            {nama || "Pengguna"}
          </Text>
          <Text className="font-sans text-sm text-slate-500 text-center mb-3">
            {email || '-'}
          </Text>

          {/* Role Chip Badge */}
          <View className="px-4 py-1.5 rounded-full border border-blue-500 bg-blue-50/60">
            <Text className="font-sans-semibold text-xs text-blue-600">
              {roleLabel}
            </Text>
          </View>
        </View>

        {/* Section Supervisor: SITE YANG DIAWASI (Conditional) */}
        {role === "SUPERVISOR" && (
          <View className="mb-6">
            <Text className="font-sans-semibold text-xs text-slate-500 tracking-wider mb-2 uppercase px-1">
              Site yang Diawasi
            </Text>

            <SectionCard className="overflow-hidden p-0 border border-slate-200">
              {isLoadingSites ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : supervisorSites.length === 0 ? (
                <View className="p-4 items-center">
                  <Text className="font-sans text-xs text-slate-500">
                    Belum ada site yang dialokasikan.
                  </Text>
                </View>
              ) : (
                supervisorSites.map((item, idx) => (
                  <View
                    key={item.id}
                    className={`p-3.5 bg-white ${
                      idx < supervisorSites.length - 1
                        ? "border-b border-slate-100"
                        : ""
                    }`}
                    testID={`item-supervisor-site-${item.id}`}
                  >
                    <Text className="font-sans-semibold text-sm text-slate-800">
                      {item.site.nama}
                    </Text>
                    {item.site.alamat ? (
                      <Text
                        className="font-sans text-xs text-slate-500 mt-0.5"
                        numberOfLines={1}
                      >
                        {item.site.alamat}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </SectionCard>
          </View>
        )}

        {/* Section KEAMANAN */}
        <View className="mb-6">
          <Text className="font-sans-semibold text-xs text-slate-500 tracking-wider mb-2 uppercase px-1">
            Keamanan
          </Text>

          <TouchableOpacity
            className="p-3.5 rounded-2xl bg-white border border-slate-200 flex-row items-center justify-between active:bg-slate-50 shadow-sm"
            onPress={() => setIsChangePasswordOpen(true)}
            testID="button-open-change-password-modal"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center border border-amber-200">
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={COLORS.amber}
                />
              </View>
              <View>
                <Text className="font-sans-bold text-sm text-slate-900 mb-0.5">
                  Ganti Password
                </Text>
                <Text className="font-sans text-xs text-slate-500">
                  Update kata sandi Anda secara berkala
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Tombol KELUAR (Red Outline Button) */}
        <TouchableOpacity
          className="py-3.5 rounded-2xl border-2 border-rose-500 bg-white flex-row items-center justify-center gap-2 mb-8 active:bg-rose-50 shadow-sm"
          onPress={() => setIsLogoutModalOpen(true)}
          testID="button-logout-profile"
        >
          <Ionicons name="log-out-outline" size={20} color="#E11D48" />
          <Text className="font-sans-bold text-sm text-rose-600 tracking-wider">
            KELUAR
          </Text>
        </TouchableOpacity>

        {/* Versi Aplikasi */}
        <Text className="font-sans text-[11px] text-slate-400 text-center mb-4">
          Versi Aplikasi 1.0.0
        </Text>
      </ScrollView>

      {/* Confirm Modal Logout */}
      <ConfirmModal
        visible={isLogoutModalOpen}
        variant="warning"
        title="Konfirmasi Keluar"
        description="Apakah Anda yakin ingin keluar dari akun Anda?"
        confirmText="Keluar"
        cancelText="Batal"
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
        testID="modal-confirm-logout"
      />

      {/* Modal Form Ganti Password */}
      <Modal
        visible={isChangePasswordOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsChangePasswordOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-2xl p-5 gap-4">
            <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
              <Text className="font-sans-bold text-base text-slate-900">
                Ganti Password
              </Text>
              <TouchableOpacity
                onPress={() => setIsChangePasswordOpen(false)}
                testID="button-close-change-password-modal"
              >
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {passwordError && (
              <AlertBanner
                type="error"
                message={passwordError}
                testID="banner-change-password-error"
              />
            )}

            {passwordSuccess && (
              <AlertBanner
                type="info"
                message={passwordSuccess}
                testID="banner-change-password-success"
              />
            )}

            {/* Form Inputs */}
            <View className="gap-3">
              <View>
                <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
                  Password Saat Ini <Text className="text-rose-500">*</Text>
                </Text>
                <TextInput
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
                  secureTextEntry
                  placeholder="Masukkan password lama"
                  placeholderTextColor="#94A3B8"
                  value={passwordLama}
                  onChangeText={setPasswordLama}
                  testID="input-password-lama"
                />
              </View>

              <View>
                <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
                  Password Baru (min 8 karakter){" "}
                  <Text className="text-rose-500">*</Text>
                </Text>
                <TextInput
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
                  secureTextEntry
                  placeholder="Masukkan password baru"
                  placeholderTextColor="#94A3B8"
                  value={passwordBaru}
                  onChangeText={setPasswordBaru}
                  testID="input-password-baru"
                />
              </View>

              <View>
                <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
                  Konfirmasi Password Baru{" "}
                  <Text className="text-rose-500">*</Text>
                </Text>
                <TextInput
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900"
                  secureTextEntry
                  placeholder="Ketik ulang password baru"
                  placeholderTextColor="#94A3B8"
                  value={konfirmasiPasswordBaru}
                  onChangeText={setKonfirmasiPasswordBaru}
                  testID="input-konfirmasi-password-baru"
                />
              </View>
            </View>

            <TouchableOpacity
              className={`py-3.5 rounded-xl bg-primary items-center justify-center mt-2 ${
                isSubmittingPassword ? "opacity-50" : "active:bg-primary-hover"
              }`}
              onPress={handleChangePasswordSubmit}
              disabled={isSubmittingPassword}
              testID="button-submit-change-password"
            >
              {isSubmittingPassword ? (
                <ActivityIndicator size="small" color={COLORS.onPrimary} />
              ) : (
                <Text className="font-sans-bold text-xs text-on-primary">
                  Simpan Password Baru
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
