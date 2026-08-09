import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AlertBanner } from "@/components/AlertBanner";
import { ErrorState, LoadingState } from "@/components/AsyncStateViews";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SectionCard } from "@/components/SectionCard";
import { COLORS } from "@/constants/theme";
import {
  approveLeaveRequest,
  downloadAndOpenDocument,
  getPendingLeaveRequests,
  rejectLeaveRequest,
} from "@/services/leave-requests.service";
import { LeaveRequestPendingItem } from "@/types/leave-request";
import { formatJakartaDate } from "@/utils/date.util";

export interface ProcessApprovalSubmitParams {
  isApprove: boolean;
  id: string;
  catatanSupervisor?: string;
  isSubmittingRef: React.MutableRefObject<boolean>;
  approveFn: (id: string, catatanSupervisor?: string) => Promise<any>;
  rejectFn: (id: string, catatanSupervisor?: string) => Promise<any>;
  invalidateQueriesFn: () => Promise<void> | void;
  refetchFn: () => Promise<void> | void;
  onSuccess: () => void;
}

export interface ProcessApprovalSubmitResult {
  success: boolean;
  errorMessage?: string;
  isConflict409?: boolean;
}

export async function processApprovalSubmit(
  params: ProcessApprovalSubmitParams,
): Promise<ProcessApprovalSubmitResult> {
  const {
    isApprove,
    id,
    catatanSupervisor,
    isSubmittingRef,
    approveFn,
    rejectFn,
    invalidateQueriesFn,
    refetchFn,
    onSuccess,
  } = params;

  if (isSubmittingRef.current) {
    return { success: false };
  }

  isSubmittingRef.current = true;

  try {
    const catatan = catatanSupervisor?.trim()
      ? catatanSupervisor.trim()
      : undefined;
    if (isApprove) {
      await approveFn(id, catatan);
    } else {
      await rejectFn(id, catatan);
    }

    await invalidateQueriesFn();
    onSuccess();
    return { success: true };
  } catch (err: unknown) {
    let message = "Gagal memproses pengajuan izin. Silakan coba lagi.";
    let isConflict409 = false;

    if (axios.isAxiosError(err)) {
      if (err.response?.status === 409) {
        isConflict409 = true;
        message =
          err.response?.data?.error?.message ||
          "Pengajuan izin ini sudah diproses atau dibatalkan oleh karyawan.";
        await refetchFn();
      } else {
        message = err.response?.data?.error?.message || message;
      }
    } else if (err instanceof Error) {
      message = err.message;
    }

    return { success: false, errorMessage: message, isConflict409 };
  } finally {
    isSubmittingRef.current = false;
  }
}

export default function SupervisorIzinScreen() {
  const queryClient = useQueryClient();
  const isSubmittingRef = useRef(false);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: "approve" | "reject";
    item: LeaveRequestPendingItem;
  } | null>(null);

  const [catatanSupervisor, setCatatanSupervisor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: pendingList = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["supervisor-pending-leave-requests"],
    queryFn: getPendingLeaveRequests,
  });

  const handleDownloadDocument = async (item: LeaveRequestPendingItem) => {
    if (!item.dokumenPendukungUrl) return;

    setDocumentError(null);
    setDownloadingId(item.id);

    try {
      const parts = item.dokumenPendukungUrl.split("/");
      const rawFilename = parts[parts.length - 1] || `dokumen-${item.id}.pdf`;
      const filename = rawFilename.includes(".")
        ? rawFilename
        : `${rawFilename}.pdf`;

      await downloadAndOpenDocument(item.id, filename);
    } catch (err: unknown) {
      let msg = "Gagal mengunduh atau membuka dokumen.";
      if (err instanceof Error) {
        msg = err.message;
      }
      setDocumentError(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  const openModal = (
    type: "approve" | "reject",
    item: LeaveRequestPendingItem,
  ) => {
    setActionError(null);
    setCatatanSupervisor("");
    setModalState({ visible: true, type, item });
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setModalState(null);
    setCatatanSupervisor("");
  };

  const handleConfirmAction = async () => {
    if (!modalState) return;

    setIsSubmitting(true);

    const result = await processApprovalSubmit({
      isApprove: modalState.type === "approve",
      id: modalState.item.id,
      catatanSupervisor,
      isSubmittingRef,
      approveFn: approveLeaveRequest,
      rejectFn: rejectLeaveRequest,
      invalidateQueriesFn: () => {
        queryClient.invalidateQueries({
          queryKey: ["supervisor-pending-leave-requests"],
        });
      },
      refetchFn: async () => {
        await refetch();
      },
      onSuccess: () => {
        setModalState(null);
        setCatatanSupervisor("");
      },
    });

    if (!result.success && result.errorMessage) {
      setActionError(result.errorMessage);
    }

    setIsSubmitting(false);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Persetujuan Izin"
        subtitle="Kelola pengajuan izin & cuti karyawan"
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {documentError && (
          <View className="mb-4">
            <AlertBanner
              type="error"
              message={documentError}
              testID="banner-document-error"
            />
          </View>
        )}

        {actionError && (
          <View className="mb-4">
            <AlertBanner
              type="error"
              message={actionError}
              testID="banner-action-error"
            />
          </View>
        )}

        {isLoading ? (
          <LoadingState message="Memuat daftar pengajuan izin..." />
        ) : isError ? (
          <ErrorState
            message="Gagal mengambil daftar pengajuan izin."
            onRetry={refetch}
          />
        ) : pendingList.length === 0 ? (
          <View
            className="items-center justify-center py-16 px-4"
            testID="empty-state-positive"
          >
            <View className="h-16 w-16 rounded-full bg-success-bg items-center justify-center mb-4">
              <Ionicons
                name="checkmark-circle-outline"
                size={32}
                color={COLORS.success}
              />
            </View>
            <Text className="font-sans-bold text-base text-slate-800 text-center">
              Semua pengajuan sudah diproses
            </Text>
            <Text className="font-sans text-xs text-slate-500 text-center mt-1">
              Tidak ada pengajuan izin atau cuti yang perlu ditinjau saat ini.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
              {pendingList.map((item: LeaveRequestPendingItem) => {
                const isDownloading = downloadingId === item.id;
                const dateMulai = formatJakartaDate(
                  new Date(item.tanggalMulai),
                );
                const dateSelesai = formatJakartaDate(
                  new Date(item.tanggalSelesai),
                );
                const dateRangeStr =
                  item.tanggalMulai === item.tanggalSelesai
                    ? dateMulai
                    : `${dateMulai} - ${dateSelesai}`;

                return (
                  <SectionCard
                    key={item.id}
                    testID={`card-leave-item-${item.id}`}
                  >
                    {/* Header Item */}
                    <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                      <View className="flex-row items-center gap-2 flex-1 mr-2">
                        <View className="h-8 w-8 rounded-full bg-slate-100 items-center justify-center">
                          <Ionicons
                            name="person-outline"
                            size={16}
                            color={COLORS.muted}
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            className="font-sans-bold text-sm text-slate-900"
                            numberOfLines={1}
                          >
                            {item.karyawan.nama}
                          </Text>
                          <Text className="font-sans text-[11px] text-slate-500 mt-0.5">
                            {dateRangeStr}
                          </Text>
                        </View>
                      </View>

                      {/* Netral Jenis Izin Badge */}
                      <View className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        <Text className="font-sans-bold text-[10px] text-slate-700 uppercase">
                          {item.jenis}
                        </Text>
                      </View>
                    </View>

                    {/* Alasan */}
                    <View className="my-3">
                      <Text className="font-sans text-xs text-slate-500 mb-0.5">
                        Alasan:
                      </Text>
                      <Text className="font-sans text-xs text-slate-800 leading-5">
                        {item.alasan || "-"}
                      </Text>
                    </View>

                    {/* Tombol Lihat Dokumen (Jika ada) */}
                    {item.dokumenPendukungUrl && (
                      <View className="mb-3 pt-2 border-t border-slate-100">
                        <TouchableOpacity
                          className="flex-row items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-info-bg border border-info/20"
                          onPress={() => handleDownloadDocument(item)}
                          disabled={isDownloading}
                          testID={`button-view-document-${item.id}`}
                        >
                          {isDownloading ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.info}
                            />
                          ) : (
                            <>
                              <Ionicons
                                name="document-text-outline"
                                size={15}
                                color={COLORS.info}
                              />
                              <Text className="font-sans-semibold text-xs text-info">
                                Lihat Dokumen Pendukung
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Actions */}
                    <View className="flex-row gap-2 pt-2 border-t border-slate-100">
                      <TouchableOpacity
                        className="flex-1 py-2.5 rounded-xl bg-destructive-bg border border-destructive/20 items-center justify-center"
                        onPress={() => openModal("reject", item)}
                        testID={`button-reject-${item.id}`}
                      >
                        <Text className="font-sans-bold text-xs text-destructive">
                          Tolak
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="flex-1 py-2.5 rounded-xl bg-success-bg border border-success/20 items-center justify-center"
                        onPress={() => openModal("approve", item)}
                        testID={`button-approve-${item.id}`}
                      >
                        <Text className="font-sans-bold text-xs text-success">
                          Setujui
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </SectionCard>
                );
              })}
            </View>
          )}
      </ScrollView>

      {/* Confirm Modal */}
      {modalState && (
        <ConfirmModal
          visible={modalState.visible}
          variant={modalState.type === "approve" ? "success" : "danger"}
          title={
            modalState.type === "approve"
              ? "Setujui Pengajuan Izin"
              : "Tolak Pengajuan Izin"
          }
          description={`Apakah Anda yakin ingin ${
            modalState.type === "approve" ? "menyetujui" : "menolak"
          } pengajuan ${modalState.item.jenis} dari ${
            modalState.item.karyawan.nama
          }?`}
          confirmText={
            isSubmitting
              ? "Memproses..."
              : modalState.type === "approve"
                ? "Setujui"
                : "Tolak"
          }
          cancelText="Batal"
          onConfirm={handleConfirmAction}
          onCancel={closeModal}
          testID="modal-confirm-approval"
        >
          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="font-sans text-xs text-slate-700">
                Catatan Supervisor (opsional):
              </Text>
              <Text className="font-sans text-[10px] text-slate-400">
                {catatanSupervisor.length}/255
              </Text>
            </View>
            <TextInput
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-900 min-h-[64px]"
              placeholder="Berikan alasan atau catatan tambahan..."
              placeholderTextColor={COLORS.muted}
              multiline
              maxLength={255}
              value={catatanSupervisor}
              onChangeText={setCatatanSupervisor}
              testID="input-catatan-supervisor"
            />
          </View>
        </ConfirmModal>
      )}
    </View>
  );
}
