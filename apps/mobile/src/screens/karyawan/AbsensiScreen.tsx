import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getTodaySchedules } from '@/services/schedule.service';
import { ScheduleTodayItem, StatusKehadiran } from '@/types/schedule';

export interface AbsensiActionConfig {
  showButton: boolean;
  buttonText: string;
  tipe: 'CHECK_IN' | 'CHECK_OUT' | null;
  badgeLabel: string;
  badgeBg: string;
  badgeTextColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

export function getAbsensiActionConfig(
  status: StatusKehadiran,
): AbsensiActionConfig {
  switch (status) {
    case 'BELUM_CHECKIN':
      return {
        showButton: true,
        buttonText: 'Check-in Sekarang',
        tipe: 'CHECK_IN',
        badgeLabel: 'Belum Check-in',
        badgeBg: 'bg-amber-100 border-amber-300',
        badgeTextColor: 'text-amber-800',
        iconName: 'log-in-outline',
      };
    case 'SUDAH_CHECKIN':
      return {
        showButton: true,
        buttonText: 'Check-out Sekarang',
        tipe: 'CHECK_OUT',
        badgeLabel: 'Sudah Check-in (Aktif)',
        badgeBg: 'bg-blue-100 border-blue-300',
        badgeTextColor: 'text-blue-800',
        iconName: 'log-out-outline',
      };
    case 'SELESAI':
    default:
      return {
        showButton: false,
        buttonText: '',
        tipe: null,
        badgeLabel: 'Presensi Selesai',
        badgeBg: 'bg-emerald-100 border-emerald-300',
        badgeTextColor: 'text-emerald-800',
        iconName: 'checkmark-circle-outline',
      };
  }
}

export function formatTime(isoStr: string): string {
  if (!isoStr) return '--:--';
  const date = new Date(isoStr);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function handleNavigationToCamera(
  jadwalId: string,
  tipe: 'CHECK_IN' | 'CHECK_OUT',
  routerPush: (opt: Href) => void,
) {
  routerPush({
    pathname: '/(karyawan)/attendance-camera',
    params: { jadwalId, tipe },
  });
}

export default function AbsensiScreen() {
  const {
    data: schedules = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['schedules', 'today'],
    queryFn: getTodaySchedules,
  });

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="border-b border-slate-200 bg-white px-6 pb-4 pt-12 shadow-xs">
        <Text className="font-sans-bold text-xl text-slate-900">
          Presensi & Absensi
        </Text>
        <Text className="font-sans text-xs text-slate-500 mt-0.5">
          Pilih jadwal kerja untuk melakukan Absensi Masuk / Pulang
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#FFC81E']}
            tintColor="#FFC81E"
          />
        }
      >
        {/* Loading State */}
        {isLoading && (
          <View className="py-12 items-center justify-center" testID="loading-state">
            <ActivityIndicator size="large" color="#FFC81E" />
            <Text className="font-sans text-xs text-slate-500 mt-3">
              Memuat jadwal hari ini...
            </Text>
          </View>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <View
            className="my-4 rounded-xl border border-rose-200 bg-rose-50 p-5 items-center"
            testID="error-state"
          >
            <Ionicons name="alert-circle-outline" size={40} color="#E11D48" />
            <Text className="mt-2 font-sans-bold text-sm text-rose-900">
              Gagal Memuat Jadwal
            </Text>
            <Text className="mt-1 font-sans text-xs text-rose-700 text-center mb-4">
              Terjadi kesalahan saat menghubungkan ke server. Silakan coba lagi.
            </Text>
            <TouchableOpacity
              className="rounded-lg bg-rose-600 px-5 py-2.5 active:opacity-80"
              onPress={() => refetch()}
              testID="button-retry-fetch"
            >
              <Text className="font-sans-semibold text-xs text-white">
                Coba Lagi
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !isError && schedules.length === 0 && (
          <View
            className="my-6 rounded-2xl border border-slate-200 bg-white p-6 items-center shadow-xs"
            testID="empty-schedule-state"
          >
            <View className="h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-3">
              <Ionicons name="calendar-clear-outline" size={28} color="#64748B" />
            </View>
            <Text className="font-sans-bold text-base text-slate-800 text-center">
              Tidak Ada Jadwal Kerja Hari Ini
            </Text>
            <Text className="font-sans text-xs text-slate-500 text-center mt-1 max-w-[260px] leading-5">
              Anda tidak memiliki shift yang terdaftar untuk hari ini. Selamat beristirahat!
            </Text>
          </View>
        )}

        {/* Schedule List */}
        {!isLoading &&
          !isError &&
          schedules.map((schedule: ScheduleTodayItem) => {
            const config = getAbsensiActionConfig(schedule.statusKehadiran);
            const jamMulaiFormatted = formatTime(schedule.jamMulai);
            const jamSelesaiFormatted = formatTime(schedule.jamSelesai);

            return (
              <View
                key={schedule.jadwalId}
                className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                testID={`schedule-card-${schedule.jadwalId}`}
              >
                {/* Header Card: Status Badge */}
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="font-sans-bold text-[11px] tracking-wider text-slate-400 uppercase">
                    Shift Kerja
                  </Text>
                  <View
                    className={`flex-row items-center px-3 py-1 rounded-full border ${config.badgeBg}`}
                  >
                    <Ionicons
                      name={config.iconName}
                      size={14}
                      className={config.badgeTextColor}
                    />
                    <Text className={`font-sans-bold text-xs ml-1 ${config.badgeTextColor}`}>
                      {config.badgeLabel}
                    </Text>
                  </View>
                </View>

                {/* Jam Shift */}
                <Text className="font-sans-extrabold text-2xl text-slate-900 mb-3">
                  {jamMulaiFormatted} – {jamSelesaiFormatted}
                </Text>

                {/* Info Site & Alamat */}
                <View className="rounded-xl bg-slate-50 p-3 border border-slate-100 mb-4">
                  <View className="flex-row items-center">
                    <Ionicons name="business" size={18} color="#D97706" />
                    <Text className="font-sans-bold text-sm text-slate-800 ml-2">
                      {schedule.site.nama}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="location-outline" size={14} color="#64748B" />
                    <Text className="font-sans text-xs text-slate-500 ml-1.5 flex-1" numberOfLines={2}>
                      {schedule.site.alamat}
                    </Text>
                  </View>
                </View>

                {/* Action Button */}
                {config.showButton && config.tipe && (
                  <TouchableOpacity
                    className={`py-3.5 rounded-xl items-center shadow-xs active:opacity-80 ${
                      config.tipe === 'CHECK_IN' ? 'bg-primary' : 'bg-slate-900'
                    }`}
                    onPress={() =>
                      handleNavigationToCamera(schedule.jadwalId, config.tipe!, router.push)
                    }
                    testID={
                      config.tipe === 'CHECK_IN'
                        ? 'button-checkin'
                        : 'button-checkout'
                    }
                  >
                    <Text
                      className={`font-sans-bold text-[14px] ${
                        config.tipe === 'CHECK_IN'
                          ? 'text-on-primary'
                          : 'text-white'
                      }`}
                    >
                      {config.buttonText}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
      </ScrollView>
    </View>
  );
}
