import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  EmptyState,
  ErrorState,
} from '@/components/AsyncStateViews';
import { SectionCard } from '@/components/SectionCard';
import { StatusBadge, StatusBadgeVariant } from '@/components/StatusBadge';
import { COLORS } from '@/constants/theme';
import { getAttendanceAttempts } from '@/services/reports.service';
import { HasilVerifikasi } from '@/types/attendance';
import { AttendanceAttemptItem } from '@/types/reports';
import { formatJakartaDateRange, formatJakartaDateTime } from '@/utils/date.util';

export function getHasilVerifikasiBadgeConfig(hasil: HasilVerifikasi): {
  variant: StatusBadgeVariant;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
} {
  switch (hasil) {
    case 'VALID':
      return {
        variant: 'success',
        label: 'Valid',
        iconName: 'checkmark-circle-outline',
      };
    case 'DI_LUAR_JENDELA_WAKTU':
      return {
        variant: 'warning',
        label: 'Di Luar Jendela Waktu',
        iconName: 'time-outline',
      };
    case 'GAGAL_LOKASI':
      return {
        variant: 'destructive',
        label: 'Gagal Lokasi',
        iconName: 'location-outline',
      };
    case 'GAGAL_WAJAH':
      return {
        variant: 'destructive',
        label: 'Gagal Wajah',
        iconName: 'person-outline',
      };
    case 'GAGAL_LIVENESS':
      return {
        variant: 'destructive',
        label: 'Gagal Liveness',
        iconName: 'eye-outline',
      };
    case 'TIDAK_HADIR':
      return {
        variant: 'destructive',
        label: 'Tidak Hadir',
        iconName: 'close-circle-outline',
      };
    default:
      return {
        variant: 'muted',
        label: hasil,
        iconName: 'help-circle-outline',
      };
  }
}

export function isAttemptsListEmpty(
  attempts: AttendanceAttemptItem[] | undefined | null,
): boolean {
  return !attempts || attempts.length === 0;
}

export interface AttendanceAttemptsModalProps {
  visible: boolean;
  onClose: () => void;
  karyawanId: string | null;
  karyawanNama: string | null;
  periodeMulai: string;
  periodeSelesai: string;
}

export function AttendanceAttemptsModal({
  visible,
  onClose,
  karyawanId,
  karyawanNama,
  periodeMulai,
  periodeSelesai,
}: AttendanceAttemptsModalProps) {
  const enabled = visible && Boolean(karyawanId && periodeMulai && periodeSelesai);

  const {
    data: attempts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      'attendance-attempts',
      karyawanId,
      periodeMulai,
      periodeSelesai,
    ],
    queryFn: () =>
      getAttendanceAttempts(karyawanId!, periodeMulai, periodeSelesai),
    enabled,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID="modal-attendance-attempts"
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[85%] p-4">
          {/* Modal Header */}
          <View className="flex-row items-start justify-between pb-3 border-b border-slate-100">
            <View className="flex-1 pr-2">
              <Text className="font-sans-bold text-base text-slate-900">
                Detail Percobaan Absensi
              </Text>
              <Text className="font-sans-medium text-xs text-slate-500 mt-0.5">
                {karyawanNama || 'Karyawan'} •{' '}
                {formatJakartaDateRange(periodeMulai, periodeSelesai)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              testID="button-close-attempts-modal"
            >
              <Ionicons name="close-circle" size={26} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Modal Body Content */}
          <ScrollView
            className="mt-3 flex-1"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {isLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text className="font-sans text-xs text-slate-500 mt-2">
                  Memuat riwayat percobaan...
                </Text>
              </View>
            ) : isError ? (
              <ErrorState
                title="Gagal Memuat Percobaan"
                message="Terjadi kesalahan saat mengambil riwayat percobaan absensi."
                onRetry={refetch}
              />
            ) : attempts.length === 0 ? (
              <EmptyState
                title="Tidak Ada Percobaan"
                description="Belum ada catatan percobaan absensi untuk karyawan ini pada periode yang dipilih."
                testID="empty-state-attempts"
              />
            ) : (
              <View className="gap-2.5">
                {attempts.map((item: AttendanceAttemptItem) => {
                  const badge = getHasilVerifikasiBadgeConfig(item.hasil);
                  const isCheckIn = item.tipe === 'CHECK_IN';

                  return (
                    <SectionCard
                      key={item.id}
                      className="p-3.5 gap-2"
                      testID={`attempt-item-${item.id}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View
                            className={`w-7 h-7 rounded-full items-center justify-center ${
                              isCheckIn ? 'bg-emerald-100' : 'bg-blue-100'
                            }`}
                          >
                            <Ionicons
                              name={
                                isCheckIn ? 'log-in-outline' : 'log-out-outline'
                              }
                              size={16}
                              color={isCheckIn ? '#166534' : '#1E40AF'}
                            />
                          </View>
                          <Text className="font-sans-bold text-xs text-slate-900">
                            {isCheckIn ? 'Check-In' : 'Check-Out'}
                          </Text>
                        </View>

                        <StatusBadge
                          variant={badge.variant}
                          label={badge.label}
                          icon={badge.iconName}
                        />
                      </View>

                      <View className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="time-outline" size={13} color="#64748B" />
                          <Text className="font-sans text-xs text-slate-700">
                            {formatJakartaDateTime(item.waktu)}
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-1">
                          <Ionicons name="navigate-outline" size={13} color="#64748B" />
                          <Text className="font-sans text-[11px] text-slate-500">
                            {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                          </Text>
                        </View>
                      </View>
                    </SectionCard>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
