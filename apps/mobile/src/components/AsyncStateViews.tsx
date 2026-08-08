import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SectionCard } from '@/components/SectionCard';
import { COLORS } from '@/constants/theme';

export interface LoadingStateProps {
  message?: string;
  testID?: string;
}

export function LoadingState({
  message = 'Memuat data...',
  testID = 'loading-state',
}: LoadingStateProps) {
  return (
    <View className="py-12 items-center justify-center" testID={testID}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text className="font-sans text-xs text-slate-500 mt-3">{message}</Text>
    </View>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  testID?: string;
}

export function ErrorState({
  title = 'Gagal Memuat Data',
  message = 'Terjadi kesalahan saat menghubungkan ke server. Silakan coba lagi.',
  onRetry,
  testID = 'error-state',
}: ErrorStateProps) {
  return (
    <View
      className="my-4 rounded-xl border border-destructive/30 bg-destructive-bg p-5 items-center"
      testID={testID}
    >
      <Ionicons name="alert-circle-outline" size={40} color={COLORS.destructive} />
      <Text className="mt-2 font-sans-bold text-sm text-destructive-text">{title}</Text>
      <Text className="mt-1 font-sans text-xs text-destructive-text/80 text-center mb-4">
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity
          className="rounded-lg bg-destructive px-5 py-2.5 active:opacity-80 shadow-xs"
          onPress={onRetry}
          testID="button-retry-fetch"
        >
          <Text className="font-sans-semibold text-xs text-white">Coba Lagi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionButton?: {
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    testID?: string;
  };
  testID?: string;
}

export function EmptyState({
  icon = 'document-text-outline',
  title,
  description,
  actionButton,
  testID = 'empty-state',
}: EmptyStateProps) {
  return (
    <SectionCard testID={testID} className="p-6 items-center">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-3">
        <Ionicons name={icon} size={28} color={COLORS.muted} />
      </View>
      <Text className="font-sans-bold text-base text-slate-800 text-center">
        {title}
      </Text>
      <Text className="font-sans text-xs text-slate-500 text-center mt-1 max-w-[260px] leading-5 mb-5">
        {description}
      </Text>
      {actionButton && (
        <TouchableOpacity
          className="bg-primary px-5 py-3 rounded-xl flex-row items-center shadow-xs active:opacity-80"
          onPress={actionButton.onPress}
          testID={actionButton.testID || 'button-empty-action'}
        >
          {actionButton.icon && (
            <Ionicons name={actionButton.icon} size={18} color={COLORS.onPrimary} />
          )}
          <Text className="ml-1.5 font-sans-bold text-xs text-on-primary">
            {actionButton.label}
          </Text>
        </TouchableOpacity>
      )}
    </SectionCard>
  );
}
