import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { ConfirmModal } from '@/components/ConfirmModal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { StatusBadge, StatusBadgeVariant } from '@/components/StatusBadge';
import { COLORS } from '@/constants/theme';
import {
  cancelLeaveRequest,
  getLeaveRequests,
} from '@/services/leave-requests.service';
import { LeaveRequestItem, StatusIzin } from '@/types/leave-request';

export interface StatusIzinBadgeConfig {
  variant: StatusBadgeVariant;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

export function getStatusIzinBadgeConfig(
  status: StatusIzin,
): StatusIzinBadgeConfig {
  switch (status) {
    case 'PENDING':
      return {
        variant: 'warning',
        label: 'Menunggu Persetujuan',
        iconName: 'time-outline',
      };
    case 'APPROVED':
      return {
        variant: 'success',
        label: 'Disetujui',
        iconName: 'checkmark-circle-outline',
      };
    case 'REJECTED':
      return {
        variant: 'destructive',
        label: 'Ditolak',
        iconName: 'close-circle-outline',
      };
    case 'CANCELLED':
    default:
      return {
        variant: 'muted',
        label: 'Dibatalkan',
        iconName: 'ban-outline',
      };
  }
}

export function formatDateRange(
  tanggalMulaiIso: string,
  tanggalSelesaiIso: string,
): string {
  if (!tanggalMulaiIso || !tanggalSelesaiIso) return '-';
  const start = new Date(tanggalMulaiIso);
  const end = new Date(tanggalSelesaiIso);

  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const startStr = start.toLocaleDateString('id-ID', opts);
  const endStr = end.toLocaleDateString('id-ID', opts);

  if (startStr === endStr) {
    return startStr;
  }
  return `${startStr} – ${endStr}`;
}

export interface CancelResultState {
  type: 'SUCCESS' | 'ALREADY_PROCESSED' | 'ERROR';
  message: string;
}

export async function processCancelLeaveRequest(
  id: string,
  cancelFn: (id: string) => Promise<{ id: string; status: StatusIzin }>,
  invalidateQueriesFn: () => Promise<void> | void,
): Promise<CancelResultState> {
  try {
    await cancelFn(id);
    await invalidateQueriesFn();
    return {
      type: 'SUCCESS',
      message: 'Pengajuan izin berhasil dibatalkan.',
    };
  } catch (err: unknown) {
    await invalidateQueriesFn();
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      return {
        type: 'ALREADY_PROCESSED',
        message:
          'Pengajuan izin ini sudah diproses oleh supervisor. Status telah diperbarui.',
      };
    }
    return {
      type: 'ERROR',
      message: 'Gagal membatalkan pengajuan izin. Silakan coba lagi.',
    };
  }
}

export default function IzinScreen() {
  const queryClient = useQueryClient();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [confirmModalId, setConfirmModalId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'SUCCESS' | 'INFO' | 'ERROR';
    text: string;
  } | null>(null);

  const {
    data: leaveRequests = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: getLeaveRequests,
  });

  const handleConfirmCancel = async (id: string) => {
    setConfirmModalId(null);
    setCancelingId(id);
    setFeedbackMessage(null);

    const result = await processCancelLeaveRequest(
      id,
      cancelLeaveRequest,
      () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
    );

    setCancelingId(null);
    if (result.type === 'SUCCESS') {
      setFeedbackMessage({ type: 'SUCCESS', text: result.message });
    } else if (result.type === 'ALREADY_PROCESSED') {
      setFeedbackMessage({ type: 'INFO', text: result.message });
    } else {
      setFeedbackMessage({ type: 'ERROR', text: result.message });
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header Reusable Component */}
      <ScreenHeader
        title="Riwayat Izin & Cuti"
        subtitle="Daftar permohonan izin dan status persetujuannya"
        rightAction={{
          label: 'Ajukan Izin',
          icon: 'add',
          onPress: () => router.push('/(karyawan)/leave-request-create'),
          testID: 'button-create-leave-request',
        }}
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
        {/* Feedback Banner Reusable Component */}
        {feedbackMessage && (
          <AlertBanner
            type={
              feedbackMessage.type === 'SUCCESS'
                ? 'success'
                : feedbackMessage.type === 'INFO'
                ? 'info'
                : 'error'
            }
            message={feedbackMessage.text}
            onDismiss={() => setFeedbackMessage(null)}
            testID="feedback-banner"
          />
        )}

        {/* Loading State Reusable Component */}
        {isLoading && (
          <LoadingState
            message="Memuat riwayat pengajuan izin..."
            testID="loading-state"
          />
        )}

        {/* Error State Reusable Component */}
        {isError && !isLoading && (
          <ErrorState
            title="Gagal Memuat Data Izin"
            message="Terjadi kesalahan saat menghubungkan ke server. Silakan coba lagi."
            onRetry={() => refetch()}
            testID="error-state"
          />
        )}

        {/* Empty State Reusable Component */}
        {!isLoading && !isError && leaveRequests.length === 0 && (
          <EmptyState
            icon="document-text-outline"
            title="Belum Ada Pengajuan Izin"
            description="Anda belum pernah mengajukan izin atau cuti. Tekan tombol di bawah untuk membuat pengajuan baru."
            actionButton={{
              label: 'Buat Pengajuan Izin',
              icon: 'add',
              onPress: () => router.push('/(karyawan)/leave-request-create'),
              testID: 'button-create-leave-request-empty',
            }}
            testID="empty-leave-state"
          />
        )}

        {/* Leave Request List */}
        {!isLoading &&
          !isError &&
          leaveRequests.map((item: LeaveRequestItem) => {
            const badgeConfig = getStatusIzinBadgeConfig(item.status);
            const dateStr = formatDateRange(item.tanggalMulai, item.tanggalSelesai);

            return (
              <SectionCard
                key={item.id}
                testID={`leave-card-${item.id}`}
                className="p-5"
              >
                {/* Header Card: Jenis & Badge Status Reusable */}
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center">
                    <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary/15 border border-primary/30 mr-2.5">
                      <Ionicons name="document-text" size={16} color={COLORS.foreground} />
                    </View>
                    <Text className="font-sans-bold text-base text-slate-900">
                      {item.jenis}
                    </Text>
                  </View>
                  <StatusBadge
                    variant={badgeConfig.variant}
                    label={badgeConfig.label}
                    icon={badgeConfig.iconName}
                    iconSize={14}
                    testID={`badge-status-${item.id}`}
                  />
                </View>

                {/* Rentang Tanggal */}
                <View className="flex-row items-center mb-3">
                  <Ionicons name="calendar-outline" size={15} color={COLORS.muted} />
                  <Text className="font-sans-bold text-sm text-slate-800 ml-1.5">
                    {dateStr}
                  </Text>
                </View>

                {/* Alasan */}
                {item.alasan && (
                  <View className="mb-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <Text className="font-sans-bold text-[10px] tracking-wider text-slate-400 uppercase mb-1">
                      Alasan
                    </Text>
                    <Text className="font-sans text-xs text-slate-700 leading-5">
                      {item.alasan}
                    </Text>
                  </View>
                )}

                {/* Catatan Supervisor */}
                {item.catatanSupervisor && (
                  <View className="mb-3 rounded-xl bg-blue-50/60 p-3 border border-blue-100">
                    <Text className="font-sans-bold text-[10px] tracking-wider text-blue-500 uppercase mb-1">
                      Catatan Supervisor
                    </Text>
                    <Text className="font-sans text-xs text-blue-900 leading-5">
                      {item.catatanSupervisor}
                    </Text>
                  </View>
                )}

                {/* Approved By */}
                {item.approvedBy && (
                  <View className="flex-row items-center mt-1 mb-2">
                    <Ionicons name="person-circle-outline" size={16} color={COLORS.muted} />
                    <Text className="font-sans text-xs text-slate-500 ml-1">
                      Diproses oleh:{' '}
                      <Text className="font-sans-semibold text-slate-800">
                        {item.approvedBy.nama}
                      </Text>
                    </Text>
                  </View>
                )}

                {/* Tombol Cancel (HANYA untuk status PENDING) */}
                {item.status === 'PENDING' && (
                  <View className="mt-3 pt-3 border-t border-slate-100">
                    <TouchableOpacity
                      className="py-2.5 rounded-xl border border-rose-200 bg-rose-50 items-center active:opacity-80 flex-row justify-center"
                      onPress={() => setConfirmModalId(item.id)}
                      disabled={cancelingId === item.id}
                      testID={`button-cancel-${item.id}`}
                    >
                      {cancelingId === item.id ? (
                        <ActivityIndicator size="small" color={COLORS.destructive} />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={16} color={COLORS.destructive} />
                          <Text className="font-sans-bold text-xs text-rose-700 ml-1.5">
                            Batalkan Pengajuan
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </SectionCard>
            );
          })}
      </ScrollView>

      {/* Modal Konfirmasi Batal Reusable Component */}
      <ConfirmModal
        visible={confirmModalId !== null}
        variant="danger"
        title="Batalkan Pengajuan Izin?"
        description="Pengajuan yang dibatalkan tidak dapat dikembalikan. Apakah Anda yakin ingin membatalkan?"
        confirmText="Ya, Batalkan"
        cancelText="Tidak, Simpan"
        onConfirm={() => confirmModalId && handleConfirmCancel(confirmModalId)}
        onCancel={() => setConfirmModalId(null)}
      />
    </View>
  );
}
