/**
 * ReminderBanner — banner pengingat dinamis berdasarkan status shift.
 *
 * Menerima ReminderContent yang dihasilkan oleh getReminderContent() dari
 * BerandaScreen (atau helper lain) dan merender banner berwarna sesuai konteks.
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

import type { ReminderContent } from '@/screens/karyawan/BerandaScreen';

interface ReminderBannerProps {
  content: ReminderContent;
  testID?: string;
}

export function ReminderBanner({ content, testID }: ReminderBannerProps) {
  return (
    <View
      className={`mt-1 mb-4 rounded-xl border ${content.borderColor} ${content.bannerBg} p-4 shadow-xs`}
      testID={testID}
    >
      {/* Header: badge label + ikon konteks */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className="mr-2 h-6 w-6 items-center justify-center rounded-full bg-orange-500">
            <Ionicons name="information-sharp" size={14} color="#FFFFFF" />
          </View>
          <View
            className={`rounded-md ${content.badgeBg} px-2 py-0.5`}
          >
            <Text
              className={`font-sans-bold text-[11px] ${content.badgeText}`}
            >
              {content.title}
            </Text>
          </View>
        </View>

        <Ionicons name={content.iconName} size={24} color="#64748B" />
      </View>

      {/* Pesan utama */}
      <Text
        className={`font-sans text-xs ${content.textColor} leading-5`}
      >
        {content.message}
      </Text>
    </View>
  );
}
