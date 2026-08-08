import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ReminderBanner } from "@/components/ReminderBanner";
import { SectionCard } from "@/components/SectionCard";
import { COLORS } from "@/constants/theme";
import { getTodaySchedules } from "@/services/schedule.service";
import { useAuthStore } from "@/store/authStore";
import { ScheduleTodayItem, StatusKehadiran } from "@/types/schedule";

// ─── Pure helpers (ditest di __tests__/BerandaScreen.test.tsx) ───────────────

export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "K";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0][0].toUpperCase();
}

export function formatTime(isoStr: string): string {
  if (!isoStr) return "--:--";
  const date = new Date(isoStr);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function calculateWorkDuration(
  startIso: string,
  endIso: string,
): string {
  if (!startIso || !endIso) return "0 jam kerja";
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  let diffMs = end - start;
  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000; // Overnight shift
  }
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  return `${hours} jam kerja`;
}

export interface ReminderContent {
  title: string;
  badgeBg: string;
  badgeText: string;
  bannerBg: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  message: string;
}

export function getReminderContent(
  schedule: ScheduleTodayItem,
): ReminderContent {
  const jamMulaiFormatted = formatTime(schedule.jamMulai);
  const jamSelesaiFormatted = formatTime(schedule.jamSelesai);

  switch (schedule.statusKehadiran) {
    case "SUDAH_CHECKIN":
      return {
        title: "Status Shift",
        badgeBg: "bg-blue-200/80",
        badgeText: "text-blue-900",
        bannerBg: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-950",
        accentColor: "text-blue-600",
        iconName: "time-outline",
        message: `Anda telah melakukan Absensi Hadir. Jangan lupa untuk melakukan Absensi Pulang setelah jam ${jamSelesaiFormatted}.`,
      };
    case "SELESAI":
      return {
        title: "Shift Selesai",
        badgeBg: "bg-emerald-200/80",
        badgeText: "text-emerald-900",
        bannerBg: "bg-emerald-50",
        borderColor: "border-emerald-200",
        textColor: "text-emerald-950",
        accentColor: "text-emerald-600",
        iconName: "checkmark-circle-outline",
        message: `Terima kasih! Anda telah menyelesaikan seluruh rangkaian absensi (Hadir & Pulang) untuk shift hari ini.`,
      };
    case "BELUM_CHECKIN":
    default:
      return {
        title: "Pengingat Penting",
        badgeBg: "bg-amber-200/80",
        badgeText: "text-amber-900",
        bannerBg: "bg-orange-50",
        borderColor: "border-orange-200",
        textColor: "text-orange-950",
        accentColor: "text-orange-600",
        iconName: "alarm-outline",
        message: `Pastikan untuk melakukan Absensi Hadir tepat waktu sebelum jam ${jamMulaiFormatted} untuk menghindari sanksi keterlambatan.`,
      };
  }
}

interface StatusConfig {
  label: string;
  subLabel: string;
  bgClass: string;
  icon: keyof typeof Ionicons.glyphMap;
  checkInDone: boolean;
  checkOutDone: boolean;
}

export function getStatusConfig(
  status: StatusKehadiran,
  jamMulaiFormatted = "08:00",
): StatusConfig {
  switch (status) {
    case "SUDAH_CHECKIN":
      return {
        label: "Sudah Check-in",
        subLabel: "Aktif bekerja",
        bgClass: "bg-blue-50 border-blue-200",
        icon: "time-outline",
        checkInDone: true,
        checkOutDone: false,
      };
    case "SELESAI":
      return {
        label: "Selesai Shift",
        subLabel: "Tugas selesai",
        bgClass: "bg-emerald-50 border-emerald-200",
        icon: "checkmark-circle-outline",
        checkInDone: true,
        checkOutDone: true,
      };
    case "BELUM_CHECKIN":
    default:
      return {
        label: "Belum Check-in",
        subLabel: `Check-in sebelum ${jamMulaiFormatted}`,
        bgClass: "bg-slate-100 border-slate-200",
        icon: "time-outline",
        checkInDone: false,
        checkOutDone: false,
      };
  }
}

// ─── Sub-components (internal) ────────────────────────────────────────────────

/** Card 1 saat tidak ada jadwal hari ini */
function EmptyScheduleCard() {
  return (
    <SectionCard accentLeft="border-l-slate-400" testID="empty-schedule-card">
      <Text className="mb-2 font-sans-bold text-[10px] tracking-wider text-slate-400 uppercase">
        Status Hari Ini
      </Text>

      <View className="flex-row items-center rounded-lg border border-slate-200 bg-slate-50 p-3">
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-slate-200/70">
          <Ionicons name="calendar-clear-outline" size={20} color="#64748B" />
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-sm text-slate-700">
            Hari Ini Bukan Jadwal Kerja Anda
          </Text>
          <Text className="font-sans text-xs text-slate-500">
            Selamat beristirahat atau nikmati hari libur Anda.
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="font-sans-bold text-[10px] tracking-wider text-slate-400 uppercase">
          Shift Hari Ini
        </Text>
        <View className="flex-row items-center">
          <Ionicons name="moon-outline" size={13} color="#64748B" />
          <Text className="ml-1 font-sans-medium text-xs text-slate-500">
            Tidak Ada Shift
          </Text>
        </View>
      </View>
      <Text className="mt-1 font-sans-extrabold text-2xl text-slate-400">
        --:-- – --:--
      </Text>
    </SectionCard>
  );
}

/** Card 1 + Card 2 untuk 1 item jadwal */
function ScheduleItemCards({ item }: { item: ScheduleTodayItem }) {
  const jamMulaiFormatted = formatTime(item.jamMulai);
  const jamSelesaiFormatted = formatTime(item.jamSelesai);
  const durasiKerja = calculateWorkDuration(item.jamMulai, item.jamSelesai);
  const config = getStatusConfig(item.statusKehadiran, jamMulaiFormatted);

  return (
    <View className="space-y-0">
      {/* CARD 1: Status & Waktu Shift */}
      <SectionCard accentLeft="border-l-primary">
        <Text className="mb-2 font-sans-bold text-[10px] tracking-wider text-slate-400 uppercase">
          Status Hari Ini
        </Text>

        <View
          className={`flex-row items-center rounded-lg border p-3 ${config.bgClass}`}
        >
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-surface shadow-xs">
            <Ionicons name={config.icon} size={20} color="#475569" />
          </View>
          <View className="flex-1">
            <Text className="font-sans-bold text-sm text-slate-800">
              {config.label}
            </Text>
            <Text className="font-sans text-xs text-slate-500">
              {config.subLabel}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <Text className="font-sans-bold text-[10px] tracking-wider text-slate-400 uppercase">
            Shift Hari Ini
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={13} color="#64748B" />
            <Text className="ml-1 font-sans-medium text-xs text-slate-600">
              {durasiKerja}
            </Text>
          </View>
        </View>
        <Text className="mt-1 font-sans-extrabold text-2xl text-slate-900">
          {jamMulaiFormatted} – {jamSelesaiFormatted}
        </Text>
      </SectionCard>

      {/* CARD 2: Lokasi & Status Absensi */}
      <SectionCard>
        {/* Lokasi Kerja */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-2">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-amber-100 border border-amber-200">
              <Ionicons name="business" size={20} color="#D97706" />
            </View>
            <View className="flex-1">
              <Text className="font-sans-bold text-[10px] tracking-wider text-slate-400 uppercase">
                Lokasi Kerja
              </Text>
              <Text
                className="font-sans-bold text-base text-slate-900"
                numberOfLines={1}
              >
                {item.site.nama}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <Ionicons name="location-outline" size={12} color="#64748B" />
                <Text
                  className="ml-1 font-sans text-xs text-slate-500"
                  numberOfLines={1}
                >
                  {item.site.alamat}
                </Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </View>

        <View className="my-3 h-[1px] bg-slate-100" />

        {/* Progress Stepper: Absensi Hadir → Absensi Pulang */}
        <View className="flex-row items-center" testID="absensi-stepper">
          {/* Node kiri: Absensi Hadir */}
          <View className="items-center">
            <View
              className={`h-9 w-9 rounded-full items-center justify-center border-2 ${
                config.checkInDone
                  ? "bg-success-bg border-success"
                  : "bg-slate-100 border-slate-300"
              }`}
              testID="badge-absensi-hadir"
            >
              <Ionicons
                name={config.checkInDone ? "checkmark-sharp" : "time-outline"}
                size={18}
                color={config.checkInDone ? COLORS.successText : COLORS.slate400}
              />
            </View>
            <Text
              className={`mt-1.5 font-sans-bold text-[10px] ${
                config.checkInDone ? "text-emerald-700" : "text-slate-400"
              }`}
            >
              Hadir
            </Text>
            <Text className="font-sans text-[10px] text-slate-400">
              {jamMulaiFormatted}
            </Text>
          </View>

          {/* Connector line */}
          <View className="flex-1 mx-2 h-[2px] rounded-full overflow-hidden bg-slate-200">
            <View
              className={`h-full rounded-full ${
                config.checkInDone ? "bg-success" : "bg-slate-200"
              }`}
              style={{ width: config.checkInDone ? "100%" : "0%" }}
            />
          </View>

          {/* Node kanan: Absensi Pulang */}
          <View className="items-center">
            <View
              className={`h-9 w-9 rounded-full items-center justify-center border-2 ${
                config.checkOutDone
                  ? "bg-success-bg border-success"
                  : config.checkInDone
                  ? "bg-amber-50 border-amber-300"
                  : "bg-slate-100 border-slate-300"
              }`}
              testID="badge-absensi-pulang"
            >
              <Ionicons
                name={
                  config.checkOutDone
                    ? "checkmark-sharp"
                    : config.checkInDone
                    ? "alarm-outline"
                    : "time-outline"
                }
                size={18}
                color={
                  config.checkOutDone
                    ? COLORS.successText
                    : config.checkInDone
                    ? COLORS.amber
                    : COLORS.slate400
                }
              />
            </View>
            <Text
              className={`mt-1.5 font-sans-bold text-[10px] ${
                config.checkOutDone
                  ? "text-emerald-700"
                  : config.checkInDone
                  ? "text-amber-600"
                  : "text-slate-400"
              }`}
            >
              Pulang
            </Text>
            <Text className="font-sans text-[10px] text-slate-400">
              {jamSelesaiFormatted}
            </Text>
          </View>
        </View>
      </SectionCard>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BerandaScreen() {
  const nama = useAuthStore((state) => state.nama);
  const initials = getInitials(nama);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  const {
    data: schedules = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["schedules", "today"],
    queryFn: getTodaySchedules,
  });

  const hasSchedules = schedules.length > 0;
  const firstSchedule = hasSchedules ? schedules[0] : null;

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Header Sapaan & Avatar ─────────────────────────────────────── */}
        <View className="flex-row items-center justify-between border-b border-border bg-surface px-6 pb-4 pt-12 shadow-xs">
          <View className="flex-1 pr-4">
            <Text className="font-sans text-xs text-muted">Selamat Datang</Text>
            <Text
              className="font-sans-bold text-xl text-foreground"
              numberOfLines={1}
            >
              Halo, {nama || "Karyawan"}
            </Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary shadow-sm">
            <Text className="font-sans-extrabold text-base text-on-primary">
              {initials}
            </Text>
          </View>
        </View>

        {/* ── Content Area ───────────────────────────────────────────────── */}
        <View className="px-5 pt-4">
          {/* Loading */}
          {isLoading && (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text className="mt-3 font-sans text-sm text-muted">
                Memuat jadwal hari ini...
              </Text>
            </View>
          )}

          {/* Error */}
          {isError && (
            <View className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-5 items-center shadow-sm">
              <Ionicons name="alert-circle" size={38} color="#E11D48" />
              <Text className="mt-2 font-sans-bold text-base text-rose-900 text-center">
                Gagal Memuat Data
              </Text>
              <Text className="mt-1 font-sans text-xs text-rose-700 text-center mb-4">
                Terjadi kendala saat terhubung ke server. Pastikan jaringan Anda
                aktif.
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                activeOpacity={0.8}
                className="rounded-lg bg-rose-600 px-6 py-2.5 shadow-sm"
                testID="retry-button"
              >
                <Text className="font-sans-bold text-xs text-white">
                  Coba Lagi
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Content */}
          {!isLoading && !isError && (
            <View className="space-y-4">
              {/* CARD 1 (+ CARD 2 jika ada jadwal) */}
              {!hasSchedules ? (
                <EmptyScheduleCard />
              ) : (
                schedules.map((item: ScheduleTodayItem) => (
                  <ScheduleItemCards key={item.jadwalId} item={item} />
                ))
              )}

              {/* AKSI CEPAT — 1 card, 3 item, divider vertikal */}
              <View className="mt-2 mb-4">
                <Text className="mb-3 font-sans-bold text-base text-slate-900">
                  Aksi Cepat
                </Text>
                <SectionCard className="py-2 px-0">
                  <View className="flex-row items-center">
                    {/* Item 1: Riwayat */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => router.push("/(karyawan)/notifikasi")}
                      className="flex-1 items-center py-2 px-3"
                      testID="quick-action-riwayat"
                    >
                      <View className="mb-2 h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                        <Ionicons name="time-outline" size={20} color="#2563EB" />
                      </View>
                      <Text className="font-sans-bold text-xs text-slate-800">
                        Riwayat
                      </Text>
                      <Text className="mt-0.5 font-sans text-[10px] text-slate-400 text-center">
                        Lihat riwayat
                      </Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View className="w-[1px] h-14 bg-slate-100" />

                    {/* Item 2: Izin */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => router.push("/(karyawan)/izin")}
                      className="flex-1 items-center py-2 px-3"
                      testID="quick-action-izin"
                    >
                      <View className="mb-2 h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                        <Ionicons
                          name="document-text-outline"
                          size={20}
                          color="#4F46E5"
                        />
                      </View>
                      <Text className="font-sans-bold text-xs text-slate-800">
                        Izin
                      </Text>
                      <Text className="mt-0.5 font-sans text-[10px] text-slate-400 text-center">
                        Ajukan izin
                      </Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View className="w-[1px] h-14 bg-slate-100" />

                    {/* Item 3: Bantuan */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setHelpModalVisible(true)}
                      className="flex-1 items-center py-2 px-3"
                      testID="quick-action-bantuan"
                    >
                      <View className="mb-2 h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
                        <Ionicons
                          name="help-circle-outline"
                          size={20}
                          color="#0284C7"
                        />
                      </View>
                      <Text className="font-sans-bold text-xs text-slate-800">
                        Bantuan
                      </Text>
                      <Text className="mt-0.5 font-sans text-[10px] text-slate-400 text-center">
                        Pusat bantuan
                      </Text>
                    </TouchableOpacity>
                  </View>
                </SectionCard>
              </View>

              {/* REMINDER BANNER DINAMIS */}
              {firstSchedule && (
                <ReminderBanner
                  content={getReminderContent(firstSchedule)}
                  testID="reminder-banner"
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Modal Bantuan HR ─────────────────────────────────────────────── */}
      <Modal
        visible={helpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl border border-slate-200 bg-surface p-6 shadow-xl">
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="help-circle-sharp" size={26} color="#FFC81E" />
                <Text className="ml-2 font-sans-bold text-lg text-slate-900">
                  Pusat Bantuan HR
                </Text>
              </View>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text className="mb-4 font-sans text-xs text-slate-600 leading-5">
              Jika Anda mengalami kendala pada presensi, jaringan, atau sistem
              lokasi, silakan hubungi tim HR Outsourcing.
            </Text>

            <View className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <View className="flex-row items-center">
                <Ionicons name="mail-outline" size={18} color="#2563EB" />
                <Text className="ml-2.5 font-sans-bold text-xs text-slate-800">
                  hr@outsourcing-company.com
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="call-outline" size={18} color="#166534" />
                <Text className="ml-2.5 font-sans-bold text-xs text-slate-800">
                  0812-3456-7890 (Senin - Jumat)
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setHelpModalVisible(false)}
              activeOpacity={0.8}
              className="rounded-xl bg-primary py-3 items-center shadow-xs"
            >
              <Text className="font-sans-bold text-sm text-on-primary">
                Tutup
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
