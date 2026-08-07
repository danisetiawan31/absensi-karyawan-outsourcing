import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export function formatAttendanceTime(isoStr?: string): string {
  if (!isoStr) return '--:-- WIB';
  const date = new Date(isoStr);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes} WIB`;
}

export default function AttendanceSuccessScreen() {
  const { tipe, waktuCheckIn, waktuCheckOut, logId } = useLocalSearchParams<{
    tipe?: 'CHECK_IN' | 'CHECK_OUT';
    waktuCheckIn?: string;
    waktuCheckOut?: string;
    logId?: string;
  }>();

  const isCheckIn = tipe !== 'CHECK_OUT';
  const waktuFormatted = formatAttendanceTime(
    isCheckIn ? waktuCheckIn : waktuCheckOut,
  );

  return (
    <View className="flex-1 bg-slate-900 justify-center items-center p-6">
      <View className="bg-surface w-full max-w-sm p-6 rounded-2xl items-center shadow-xl">
        <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mb-5">
          <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
        </View>

        <Text className="text-[20px] font-sans-bold text-slate-900 text-center mb-1">
          {isCheckIn ? 'Absensi Hadir Berhasil!' : 'Absensi Pulang Berhasil!'}
        </Text>
        <Text className="text-[13px] font-sans-regular text-slate-500 text-center mb-6">
          Data presensi Anda telah tercatat dengan verifikasi valid.
        </Text>

        <View className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
          <View className="flex-row justify-between items-center pb-2 border-b border-slate-200">
            <Text className="font-sans text-xs text-slate-500">Jenis Presensi</Text>
            <Text className="font-sans-bold text-xs text-slate-800">
              {isCheckIn ? 'Check-in (Hadir)' : 'Check-out (Pulang)'}
            </Text>
          </View>

          <View className="flex-row justify-between items-center pb-2 border-b border-slate-200">
            <Text className="font-sans text-xs text-slate-500">Waktu Tercatat</Text>
            <Text className="font-sans-bold text-xs text-emerald-700">
              {waktuFormatted}
            </Text>
          </View>

          {logId && (
            <View className="flex-row justify-between items-center">
              <Text className="font-sans text-xs text-slate-500">ID Log</Text>
              <Text
                className="font-sans-semibold text-[11px] text-slate-600 max-w-[160px]"
                numberOfLines={1}
              >
                {logId}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          className="bg-primary w-full py-3.5 rounded-xl items-center active:opacity-80"
          onPress={() => router.replace('/(karyawan)')}
          testID="button-back-to-home"
        >
          <Text className="font-sans-bold text-[15px] text-on-primary">
            Kembali ke Beranda
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
