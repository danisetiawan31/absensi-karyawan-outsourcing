import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/AsyncStateViews';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { StatusBadge, StatusBadgeVariant } from '@/components/StatusBadge';
import { COLORS } from '@/constants/theme';
import {
  getAttendanceDashboard,
  getUnfilledShifts,
} from '@/services/dashboard.service';
import {
  DashboardAttendanceItem,
  DashboardAttendanceStatus,
  UnfilledShiftItem,
} from '@/types/dashboard';
import {
  formatJakartaDate,
  formatJakartaTime,
  formatJakartaYmd,
} from '@/utils/date.util';

export interface DashboardStatusConfig {
  variant: StatusBadgeVariant;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

export function getDashboardStatusBadgeConfig(
  status: DashboardAttendanceStatus,
): DashboardStatusConfig {
  switch (status) {
    case 'HADIR':
      return {
        variant: 'success',
        label: 'Hadir',
        iconName: 'checkmark-circle-outline',
      };
    case 'TERLAMBAT':
      return {
        variant: 'warning',
        label: 'Terlambat',
        iconName: 'alert-circle-outline',
      };
    case 'IZIN':
      return {
        variant: 'info',
        label: 'Izin / Cuti',
        iconName: 'document-text-outline',
      };
    case 'TIDAK_HADIR':
      return {
        variant: 'destructive',
        label: 'Tidak Hadir',
        iconName: 'close-circle-outline',
      };
    case 'BELUM':
    default:
      return {
        variant: 'muted',
        label: 'Belum Absen',
        iconName: 'time-outline',
      };
  }
}

export default function SupervisorHomeScreen() {
  const todayYmd = formatJakartaYmd(new Date());
  const todayDisplay = formatJakartaDate(new Date());

  const {
    data: attendanceItems = [],
    isLoading: isLoadingAttendance,
    isError: isErrorAttendance,
    isRefetching: isRefetchingAttendance,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ['supervisor-attendance', todayYmd],
    queryFn: () => getAttendanceDashboard(todayYmd),
  });

  const {
    data: unfilledShifts = [],
    isLoading: isLoadingUnfilled,
    isError: isErrorUnfilled,
    isRefetching: isRefetchingUnfilled,
    refetch: refetchUnfilled,
  } = useQuery({
    queryKey: ['supervisor-unfilled-shifts', todayYmd],
    queryFn: () => getUnfilledShifts(todayYmd),
  });

  const isLoading = isLoadingAttendance || isLoadingUnfilled;
  const isError = isErrorAttendance || isErrorUnfilled;
  const isRefetching = isRefetchingAttendance || isRefetchingUnfilled;

  const handleRefresh = () => {
    refetchAttendance();
    refetchUnfilled();
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Dashboard Supervisor"
        subtitle={`Monitoring Kehadiran — ${todayDisplay}`}
      />

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Loading State */}
        {isLoading && (
          <LoadingState
            message="Memuat dashboard supervisor..."
            testID="loading-state"
          />
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <ErrorState
            title="Gagal Memuat Dashboard"
            message="Terjadi kesalahan saat mengunduh data kehadiran supervisor. Silakan coba lagi."
            onRetry={handleRefresh}
            testID="error-state"
          />
        )}

        {/* SECTION 1: Unfilled Shifts Alert (HANYA render jika ada data unfilled shifts) */}
        {!isLoading && !isError && unfilledShifts.length > 0 && (
          <View className="mb-4" testID="unfilled-shifts-section">
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center">
                <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
                <Text className="ml-1.5 font-sans-bold text-sm text-warning-text">
                  Shift Belum Terisi ({unfilledShifts.length})
                </Text>
              </View>
              <Text className="font-sans text-[11px] text-warning-text font-sans-medium">
                T+15 Menit Belum Check-in
              </Text>
            </View>

            {unfilledShifts.map((item: UnfilledShiftItem) => {
              const jamMulaiStr = formatJakartaTime(item.jamMulai);
              const jamSelesaiStr = formatJakartaTime(item.jamSelesai);

              return (
                <SectionCard
                  key={item.jadwalId}
                  accentLeft="border-l-warning"
                  className="bg-warning-bg border-warning/30 p-4 mb-2.5"
                  testID={`unfilled-shift-item-${item.jadwalId}`}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="font-sans-bold text-sm text-slate-900">
                        {item.karyawan}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="business-outline" size={13} color={COLORS.muted} />
                        <Text className="ml-1 font-sans text-xs text-slate-600">
                          {item.site}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <View className="rounded-md bg-warning/15 px-2 py-0.5 border border-warning/30">
                        <Text className="font-sans-bold text-[11px] text-warning-text">
                          Terlambat {item.menitTerlambat} mnt
                        </Text>
                      </View>
                      <Text className="font-sans text-[11px] text-slate-500 mt-1">
                        {jamMulaiStr} – {jamSelesaiStr}
                      </Text>
                    </View>
                  </View>
                </SectionCard>
              );
            })}
          </View>
        )}

        {/* Empty State (HANYA saat attendance kosong total) */}
        {!isLoading && !isError && attendanceItems.length === 0 && (
          <EmptyState
            icon="calendar-outline"
            title="Tidak Ada Shift Hari Ini"
            description="Belum ada jadwal shift karyawan yang terdaftar untuk hari ini."
            testID="empty-dashboard-state"
          />
        )}

        {/* SECTION 2: List Kehadiran Karyawan */}
        {!isLoading && !isError && attendanceItems.length > 0 && (
          <View className="mb-2">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-sans-bold text-base text-slate-900">
                Daftar Kehadiran ({attendanceItems.length})
              </Text>
              <Text className="font-sans text-xs text-slate-400">
                Hari Ini
              </Text>
            </View>

            {attendanceItems.map((item: DashboardAttendanceItem, index: number) => {
              const config = getDashboardStatusBadgeConfig(item.status);
              const waktuCheckInStr = item.waktuCheckIn
                ? formatJakartaTime(item.waktuCheckIn)
                : null;

              return (
                <SectionCard
                  key={`${item.karyawan}-${item.site}-${index}`}
                  className="p-4 mb-3"
                  testID={`attendance-card-${index}`}
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="font-sans-bold text-sm text-slate-900">
                        {item.karyawan}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="location-outline" size={13} color={COLORS.muted} />
                        <Text className="ml-1 font-sans text-xs text-slate-500">
                          {item.site}
                        </Text>
                      </View>
                    </View>

                    <StatusBadge
                      variant={config.variant}
                      label={config.label}
                      icon={config.iconName}
                      testID={`attendance-status-${item.status}`}
                    />
                  </View>

                  {/* Waktu Check-In bila ada */}
                  {waktuCheckInStr && (
                    <View className="mt-2 pt-2 border-t border-slate-100 flex-row items-center justify-between">
                      <Text className="font-sans text-[11px] text-slate-400">
                        Waktu Presensi
                      </Text>
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={12} color={COLORS.muted} />
                        <Text className="ml-1 font-sans-semibold text-xs text-slate-700">
                          {waktuCheckInStr} WIB
                        </Text>
                      </View>
                    </View>
                  )}
                </SectionCard>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
