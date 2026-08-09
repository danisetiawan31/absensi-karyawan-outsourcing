import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AlertBanner } from "@/components/AlertBanner";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/AsyncStateViews";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SectionCard } from "@/components/SectionCard";
import { COLORS } from "@/constants/theme";
import { deleteSchedule, getSchedules } from "@/services/schedules.service";
import { getSupervisorSites } from "@/services/supervisor-sites.service";
import { ScheduleItem } from "@/types/schedule";
import { SupervisorSiteItem } from "@/types/supervisor-site";
import {
  formatJakartaDate,
  formatJakartaTime,
  formatJakartaYmd,
} from "@/utils/date.util";

export default function SupervisorJadwalScreen() {
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(
    undefined,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tanggalYmd = formatJakartaYmd(selectedDate);
  const tanggalDisplay = formatJakartaDate(selectedDate);

  // Fetch Supervisor Sites
  const { data: sites = [] } = useQuery({
    queryKey: ["supervisor-sites"],
    queryFn: getSupervisorSites,
  });

  // Auto-select site if supervisor only oversees 1 site
  useEffect(() => {
    if (sites.length === 1) {
      setSelectedSiteId(sites[0].site.id);
    }
  }, [sites]);

  const showSitePicker = sites.length > 1;

  // Fetch Schedules
  const {
    data: schedules = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["supervisor-schedules", tanggalYmd, selectedSiteId],
    queryFn: () => getSchedules(tanggalYmd, selectedSiteId),
  });

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const scheduleToDelete = schedules.find((s) => s.id === deletingScheduleId);

  const handleConfirmDelete = async () => {
    if (!deletingScheduleId) return;

    const targetId = deletingScheduleId;
    setDeletingScheduleId(null);
    setErrorMessage(null);

    try {
      await deleteSchedule(targetId);
      queryClient.invalidateQueries({
        queryKey: ["supervisor-schedules"],
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.error?.message ||
          "Gagal menghapus jadwal shift. Silakan coba lagi.";
        setErrorMessage(message);
      } else {
        setErrorMessage("Terjadi kesalahan yang tidak terduga saat menghapus.");
      }
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Jadwal Shift Supervisor"
        subtitle="Kelola jadwal dan penugasan karyawan"
      />

      <ScrollView
        className="flex-1 px-5 pt-4"
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
        {/* Top Control Bar: Tambah Button & Date Selector */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-sans-bold text-base text-slate-900">
              Daftar Shift
            </Text>
            <TouchableOpacity
              className="flex-row items-center rounded-xl bg-primary px-3.5 py-2 shadow-xs"
              onPress={() => router.push("/(supervisor)/jadwal-form")}
              testID="button-add-schedule"
            >
              <Ionicons name="add" size={18} color={COLORS.onPrimary} />
              <Text className="ml-1 font-sans-bold text-xs text-on-primary">
                Tambah Jadwal
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Selector Row */}
          <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-2 shadow-xs">
            <TouchableOpacity
              className="p-2 rounded-xl bg-slate-100"
              onPress={handlePrevDay}
              testID="button-prev-day"
            >
              <Ionicons name="chevron-back" size={18} color={COLORS.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
              onPress={() => setShowDatePicker(true)}
              testID="button-date-picker-trigger"
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={COLORS.warning}
              />
              <Text className="ml-2 font-sans-bold text-xs text-slate-800">
                {tanggalDisplay}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="p-2 rounded-xl bg-slate-100"
              onPress={handleNextDay}
              testID="button-next-day"
            >
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            testID="date-picker-input"
          />
        )}

        {/* Site Filter Picker (HANYA jika >1 site) */}
        {showSitePicker && (
          <View className="mb-4" testID="site-picker-container">
            <Text className="font-sans-medium text-xs text-slate-500 mb-2">
              Filter Location Site
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            >
              <TouchableOpacity
                className={`mr-2 px-3.5 py-2 rounded-xl border ${
                  selectedSiteId === undefined
                    ? "bg-slate-900 border-slate-900"
                    : "bg-white border-slate-200"
                }`}
                onPress={() => setSelectedSiteId(undefined)}
                testID="site-filter-all"
              >
                <Text
                  className={`font-sans-bold text-xs ${
                    selectedSiteId === undefined
                      ? "text-white"
                      : "text-slate-700"
                  }`}
                >
                  Semua Site ({sites.length})
                </Text>
              </TouchableOpacity>

              {sites.map((item: SupervisorSiteItem) => {
                const isSelected = selectedSiteId === item.site.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    className={`mr-2 px-3.5 py-2 rounded-xl border ${
                      isSelected
                        ? "bg-slate-900 border-slate-900"
                        : "bg-white border-slate-200"
                    }`}
                    onPress={() => setSelectedSiteId(item.site.id)}
                    testID={`site-filter-item-${item.site.id}`}
                  >
                    <Text
                      className={`font-sans-bold text-xs ${
                        isSelected ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {item.site.nama}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Error Alert Banner (bila delete atau request gagal) */}
        {errorMessage && (
          <AlertBanner
            type="error"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
            testID="error-alert-banner"
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <LoadingState
            message="Memuat jadwal shift..."
            testID="loading-state"
          />
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <ErrorState
            title="Gagal Memuat Jadwal"
            message="Terjadi kesalahan saat mengambil daftar jadwal shift. Silakan coba lagi."
            onRetry={refetch}
            testID="error-state"
          />
        )}

        {/* Empty State */}
        {!isLoading && !isError && schedules.length === 0 && (
          <EmptyState
            icon="calendar-outline"
            title="Tidak Ada Jadwal Shift"
            description="Belum ada jadwal shift karyawan yang dibuat untuk tanggal dan lokasi ini."
            testID="empty-schedules-state"
          />
        )}

        {/* Schedule List */}
        {!isLoading && !isError && schedules.length > 0 && (
          <View testID="schedule-list-container">
            {schedules.map((item: ScheduleItem) => {
              const jamMulaiStr = formatJakartaTime(item.jamMulai);
              const jamSelesaiStr = formatJakartaTime(item.jamSelesai);

              return (
                <SectionCard
                  key={item.id}
                  className="p-4 mb-3"
                  testID={`schedule-card-${item.id}`}
                >
                  <View className="flex-row items-center justify-between">
                    {/* Informasional Karyawan & Shift */}
                    <View className="flex-1 mr-2">
                      <Text className="font-sans-bold text-sm text-slate-900">
                        {item.karyawan.nama}
                      </Text>

                      <View className="flex-row items-center mt-1">
                        <Ionicons
                          name="time-outline"
                          size={13}
                          color={COLORS.warning}
                        />
                        <Text className="ml-1 font-sans-bold text-xs text-slate-800">
                          {jamMulaiStr} – {jamSelesaiStr}
                        </Text>
                      </View>

                      {showSitePicker && (
                        <View className="flex-row items-center mt-1">
                          <Ionicons
                            name="business-outline"
                            size={12}
                            color={COLORS.muted}
                          />
                          <Text className="ml-1 font-sans text-xs text-slate-500">
                            {item.site.nama}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Tombol Aksi: Edit & Delete */}
                    <View className="flex-row items-center gap-1.5">
                      <TouchableOpacity
                        className="p-2 rounded-xl bg-slate-100 border border-slate-200"
                        onPress={() => {
                          const itemTanggalStr = formatJakartaYmd(
                            new Date(item.tanggal),
                          );
                          router.push(
                            `/(supervisor)/jadwal-form?id=${item.id}&tanggal=${itemTanggalStr}`,
                          );
                        }}
                        testID={`button-edit-${item.id}`}
                      >
                        <Ionicons
                          name="create-outline"
                          size={16}
                          color={COLORS.muted}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="p-2 rounded-xl bg-destructive-bg border border-destructive/20"
                        onPress={() => setDeletingScheduleId(item.id)}
                        testID={`button-delete-${item.id}`}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={COLORS.destructive}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </SectionCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={!!deletingScheduleId}
        variant="danger"
        title="Hapus Jadwal Shift?"
        description={`Jadwal shift untuk ${
          scheduleToDelete?.karyawan.nama || "karyawan"
        } akan dihapus permanently.`}
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingScheduleId(null)}
        testID="modal-confirm-delete-schedule"
      />
    </View>
  );
}
