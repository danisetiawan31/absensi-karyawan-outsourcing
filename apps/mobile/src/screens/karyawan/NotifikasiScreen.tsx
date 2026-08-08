import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
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
  getNotifications,
  markAsRead,
} from '@/services/notifications.service';
import { NotificationItem, TipeNotifikasi } from '@/types/notification';

export interface NotificationTypeConfig {
  variant: StatusBadgeVariant;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  typeLabel: string;
  accentBgClass: string;
}

export function getNotificationTypeConfig(
  tipe: TipeNotifikasi | string,
): NotificationTypeConfig {
  switch (tipe) {
    case 'REMINDER_CHECKIN':
      return {
        variant: 'warning',
        iconName: 'time-outline',
        iconColor: COLORS.warning,
        typeLabel: 'Pengingat Presensi',
        accentBgClass: 'bg-warning-bg border-warning/30',
      };
    case 'PERUBAHAN_JADWAL':
      return {
        variant: 'info',
        iconName: 'calendar-outline',
        iconColor: COLORS.info,
        typeLabel: 'Perubahan Jadwal',
        accentBgClass: 'bg-info-bg border-info/30',
      };
    case 'ALERT_SUPERVISOR':
    case 'PENGAJUAN_IZIN_ORPHANED':
    default:
      return {
        variant: 'muted',
        iconName: 'notifications-outline',
        iconColor: COLORS.muted,
        typeLabel: 'Pemberitahuan',
        accentBgClass: 'bg-slate-100 border-slate-200',
      };
  }
}

import { formatJakartaDateTime } from '@/utils/date.util';

export const formatNotificationDate = formatJakartaDateTime;

export interface MarkNotificationResultState {
  success: boolean;
  errorMessage?: string;
  updatedNotifications: NotificationItem[];
}

export async function processMarkNotificationAsRead(
  id: string,
  currentNotifications: NotificationItem[],
  markFn: (id: string) => Promise<{ success: boolean }>,
  pendingIdsSet?: Set<string>,
): Promise<MarkNotificationResultState> {
  const target = currentNotifications.find((n) => n.id === id);
  if (!target || target.dibaca) {
    return { success: true, updatedNotifications: currentNotifications };
  }

  if (pendingIdsSet) {
    if (pendingIdsSet.has(id)) {
      return { success: true, updatedNotifications: currentNotifications };
    }
    pendingIdsSet.add(id);
  }

  const optimisticList = currentNotifications.map((n) =>
    n.id === id ? { ...n, dibaca: true } : n,
  );

  try {
    await markFn(id);
    return { success: true, updatedNotifications: optimisticList };
  } catch {
    return {
      success: false,
      errorMessage: 'Gagal memperbarui status notifikasi. Silakan coba lagi.',
      updatedNotifications: currentNotifications,
    };
  } finally {
    if (pendingIdsSet) {
      pendingIdsSet.delete(id);
    }
  }
}

export default function NotifikasiScreen() {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingMarkAsReadIdsRef = React.useRef<Set<string>>(new Set());

  const {
    data: notifications = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const handleItemPress = async (item: NotificationItem) => {
    if (item.dibaca) return;

    setErrorMessage(null);

    // Optimistically update query data
    queryClient.setQueryData<NotificationItem[]>(['notifications'], (old = []) =>
      old.map((n) => (n.id === item.id ? { ...n, dibaca: true } : n)),
    );

    const result = await processMarkNotificationAsRead(
      item.id,
      notifications,
      markAsRead,
      pendingMarkAsReadIdsRef.current,
    );

    if (!result.success && result.errorMessage) {
      setErrorMessage(result.errorMessage);
      // Revert cache on error
      queryClient.setQueryData<NotificationItem[]>(
        ['notifications'],
        result.updatedNotifications,
      );
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Notifikasi"
        subtitle="Riwayat pemberitahuan dan pengingat"
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
        {errorMessage && (
          <AlertBanner
            type="error"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
            testID="error-banner"
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <LoadingState
            message="Memuat notifikasi..."
            testID="loading-state"
          />
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <ErrorState
            title="Gagal Memuat Notifikasi"
            message="Terjadi kesalahan saat menghubungkan ke server. Silakan coba lagi."
            onRetry={() => refetch()}
            testID="error-state"
          />
        )}

        {/* Empty State */}
        {!isLoading && !isError && notifications.length === 0 && (
          <EmptyState
            icon="notifications-off-outline"
            title="Belum Ada Notifikasi"
            description="Anda belum memiliki pemberitahuan atau pengingat baru saat ini."
            testID="empty-notifications-state"
          />
        )}

        {/* Notification List */}
        {!isLoading &&
          !isError &&
          notifications.map((item: NotificationItem) => {
            const config = getNotificationTypeConfig(item.tipe);
            const dateDisplay = formatNotificationDate(item.createdAt);
            const isUnread = !item.dibaca;

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => handleItemPress(item)}
                testID={`notification-card-${item.id}`}
              >
                <SectionCard
                  className={`p-4 mb-3 ${
                    isUnread ? 'bg-surface border-slate-200' : 'bg-slate-50/70 border-slate-200/60'
                  }`}
                  testID={isUnread ? `unread-card-${item.id}` : `read-card-${item.id}`}
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-row items-center flex-1 mr-2">
                      {/* Icon container */}
                      <View
                        className={`h-8 w-8 items-center justify-center rounded-lg border mr-2.5 ${config.accentBgClass}`}
                      >
                        <Ionicons
                          name={config.iconName}
                          size={16}
                          color={config.iconColor}
                        />
                      </View>
                      <StatusBadge
                        variant={config.variant}
                        label={config.typeLabel}
                        icon={config.iconName}
                        iconSize={12}
                        testID={`type-badge-${item.id}`}
                      />
                    </View>

                    {/* Unread dot indicator */}
                    {isUnread && (
                      <View
                        className="h-2.5 w-2.5 rounded-full bg-primary mt-1"
                        testID={`unread-dot-${item.id}`}
                      />
                    )}
                  </View>

                  {/* Message body */}
                  <Text
                    className={`text-xs leading-5 mb-2 ${
                      isUnread
                        ? 'font-sans-bold text-slate-900'
                        : 'font-sans text-slate-600'
                    }`}
                  >
                    {item.pesan}
                  </Text>

                  {/* CreatedAt timestamp */}
                  <View className="flex-row items-center">
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={COLORS.muted}
                    />
                    <Text className="ml-1 font-sans text-[11px] text-slate-400">
                      {dateDisplay}
                    </Text>
                  </View>
                </SectionCard>
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </View>
  );
}
