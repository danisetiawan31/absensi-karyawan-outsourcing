import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchInput } from "@/components/SearchInput";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { COLORS } from "@/constants/theme";
import { getEmployees } from "@/services/employees.service";
import {
  downloadAndOpenDocument,
  getLeaveRequestsHistory,
} from "@/services/leave-requests.service";
import { Employee } from "@/types/employee";
import { LeaveRequestHistoryItem } from "@/types/leave-request";
import {
  formatJakartaDateRange,
  formatJakartaYmd,
} from "@/utils/date.util";
import { getStatusIzinBadgeConfig } from "@/utils/status-izin-badge.util";

export function getDefault30DaysPeriodDates(nowDate: Date = new Date()): {
  dateMulai: Date;
  dateSelesai: Date;
} {
  const dateSelesai = nowDate;
  const dateMulai = new Date(nowDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { dateMulai, dateSelesai };
}

export function filterEmployeesForPicker(
  employees: Employee[],
  searchQuery: string = "",
): Employee[] {
  if (!Array.isArray(employees)) return [];
  const q = searchQuery.trim().toLowerCase();
  if (!q) return employees;
  return employees.filter(
    (emp) =>
      emp.nama.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q),
  );
}

export default function HrAdminLeaveHistoryScreen() {
  const initialPeriod = useMemo(() => getDefault30DaysPeriodDates(), []);

  const [dateMulai, setDateMulai] = useState<Date | null>(
    initialPeriod.dateMulai,
  );
  const [dateSelesai, setDateSelesai] = useState<Date | null>(
    initialPeriod.dateSelesai,
  );

  const [selectedKaryawan, setSelectedKaryawan] = useState<Employee | null>(
    null,
  );

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState("");
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const periodeMulaiStr = dateMulai ? formatJakartaYmd(dateMulai) : undefined;
  const periodeSelesaiStr = dateSelesai
    ? formatJakartaYmd(dateSelesai)
    : undefined;

  // Fetch Leave Requests History
  const {
    data: historyItems = [],
    isLoading: isLoadingHistory,
    isError: isErrorHistory,
    refetch: refetchHistory,
    isRefetching,
  } = useQuery({
    queryKey: [
      "leave-requests-history",
      selectedKaryawan?.id || null,
      periodeMulaiStr || null,
      periodeSelesaiStr || null,
    ],
    queryFn: () =>
      getLeaveRequestsHistory({
        karyawanId: selectedKaryawan?.id,
        periodeMulai: periodeMulaiStr,
        periodeSelesai: periodeSelesaiStr,
      }),
  });

  // Fetch Employees List for Filter (when picker open)
  const { data: karyawanList = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees", "KARYAWAN"],
    queryFn: () => getEmployees({ role: "KARYAWAN", statusAktif: true }),
    enabled: isPickerOpen,
  });

  const availableEmployees = useMemo(
    () => filterEmployeesForPicker(karyawanList, pickerSearchQuery),
    [karyawanList, pickerSearchQuery],
  );

  const handleDownloadDoc = async (item: LeaveRequestHistoryItem) => {
    if (!item.dokumenPendukungUrl) return;
    setDownloadingDocId(item.id);
    setDocError(null);
    try {
      const filename =
        item.dokumenPendukungUrl.split("/").pop() || `dokumen-${item.id}.pdf`;
      await downloadAndOpenDocument(item.id, filename);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal membuka dokumen pendukung.";
      setDocError(msg);
    } finally {
      setDownloadingDocId(null);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Riwayat Pengajuan Izin"
        subtitle="Seluruh riwayat izin karyawan (Read-Only)"
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchHistory}
            colors={[COLORS.primary]}
          />
        }
      >
        {docError && (
          <AlertBanner
            type="error"
            message={docError}
            testID="banner-doc-error"
          />
        )}

        {/* Filter Section */}
        <SectionCard className="p-4 gap-3 mb-4" testID="section-filters">
          <DateRangeFilter
            dateMulai={dateMulai}
            dateSelesai={dateSelesai}
            onDateMulaiChange={setDateMulai}
            onDateSelesaiChange={setDateSelesai}
            allowEmpty={true}
            title="Filter Data"
            resetLabel="Reset Filter (Histori Lengkap)"
            onReset={() => {
              setDateMulai(null);
              setDateSelesai(null);
              setSelectedKaryawan(null);
            }}
          />

          {/* Filter Karyawan Picker Trigger */}
          <View className="pt-2 border-t border-slate-100">
            <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
              Karyawan
            </Text>
            <TouchableOpacity
              className="flex-row items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50"
              onPress={() => setIsPickerOpen(true)}
              testID="button-open-karyawan-picker"
            >
              <Text
                className="font-sans text-xs text-slate-900 flex-1 pr-2"
                numberOfLines={1}
              >
                {selectedKaryawan ? selectedKaryawan.nama : "Semua Karyawan"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* Content List */}
        {isLoadingHistory ? (
          <LoadingState message="Memuat riwayat izin..." />
        ) : isErrorHistory ? (
          <ErrorState
            title="Gagal Memuat Data"
            message="Terjadi kesalahan saat mengunduh riwayat pengajuan izin."
            onRetry={refetchHistory}
          />
        ) : historyItems.length === 0 ? (
          <EmptyState
            title="Tidak Ada Riwayat Izin"
            description="Tidak ditemukan pengajuan izin untuk filter yang dipilih."
            testID="empty-state-history"
          />
        ) : (
          <View className="gap-3">
            {historyItems.map((item) => {
              const badgeConfig = getStatusIzinBadgeConfig(item.status);
              const isDownloading = downloadingDocId === item.id;

              return (
                <SectionCard
                  key={item.id}
                  className="p-4 gap-2.5"
                  testID={`item-leave-history-${item.id}`}
                >
                  {/* Header: Nama Karyawan & Status Badge */}
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="font-sans-bold text-sm text-slate-900">
                        {item.karyawan.nama}
                      </Text>
                      <Text className="font-sans-medium text-xs text-slate-500 mt-0.5">
                        {item.jenis} •{" "}
                        {formatJakartaDateRange(
                          item.tanggalMulai,
                          item.tanggalSelesai,
                        )}
                      </Text>
                    </View>

                    <StatusBadge
                      variant={badgeConfig.variant}
                      label={badgeConfig.label}
                      icon={badgeConfig.iconName}
                    />
                  </View>

                  {/* Alasan */}
                  {Boolean(item.alasan) && (
                    <View className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <Text className="font-sans-semibold text-[11px] text-slate-500 mb-0.5">
                        Alasan:
                      </Text>
                      <Text className="font-sans text-xs text-slate-700">
                        {item.alasan}
                      </Text>
                    </View>
                  )}

                  {/* Catatan Supervisor / Approver */}
                  {(Boolean(item.catatanSupervisor) ||
                    Boolean(item.approvedBy)) && (
                    <View className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 gap-1">
                      {Boolean(item.approvedBy) && (
                        <Text className="font-sans-medium text-[11px] text-slate-500">
                          Diproses oleh:{" "}
                          <Text className="font-sans-bold text-slate-800">
                            {item.approvedBy?.nama}
                          </Text>
                        </Text>
                      )}
                      {Boolean(item.catatanSupervisor) && (
                        <Text className="font-sans text-xs text-slate-600">
                          Catatan: {item.catatanSupervisor}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Tombol Lihat Dokumen (HANYA MUNCUL JIKA dokumenPendukungUrl !== null) */}
                  {item.dokumenPendukungUrl !== null && (
                    <TouchableOpacity
                      className="flex-row items-center justify-center py-2.5 rounded-xl border border-slate-200 bg-white mt-1 active:bg-slate-50"
                      onPress={() => handleDownloadDoc(item)}
                      disabled={isDownloading}
                      testID={`button-view-doc-${item.id}`}
                    >
                      {isDownloading ? (
                        <ActivityIndicator
                          size="small"
                          color={COLORS.primary}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="document-text-outline"
                            size={16}
                            color="#334155"
                          />
                          <Text className="font-sans-bold text-xs text-slate-700 ml-1.5">
                            Lihat Dokumen
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </SectionCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Picker Karyawan */}
      <Modal
        visible={isPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-2xl max-h-[80%] p-4">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <Text className="font-sans-bold text-base text-slate-900">
                Pilih Karyawan
              </Text>
              <TouchableOpacity
                onPress={() => setIsPickerOpen(false)}
                testID="button-close-karyawan-picker"
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={COLORS.slate400}
                />
              </TouchableOpacity>
            </View>

            {/* Search Bar Input */}
            <SearchInput
              value={pickerSearchQuery}
              onChangeText={setPickerSearchQuery}
              placeholder="Cari nama karyawan..."
              testID="input-search-karyawan-picker"
              containerClassName="flex-row items-center bg-slate-100 px-3 py-2 rounded-xl mt-3 mb-3 border border-slate-200"
              iconSize={16}
            />

            {/* Opsi "Semua Karyawan" */}
            <TouchableOpacity
              className={`p-3 rounded-xl border mb-2 flex-row items-center justify-between ${
                selectedKaryawan === null
                  ? "bg-amber-50 border-amber-300"
                  : "bg-slate-50 border-slate-200"
              }`}
              onPress={() => {
                setSelectedKaryawan(null);
                setIsPickerOpen(false);
              }}
              testID="option-all-karyawan"
            >
              <Text
                className={`font-sans-bold text-xs ${
                  selectedKaryawan === null
                    ? "text-amber-800"
                    : "text-slate-700"
                }`}
              >
                Semua Karyawan
              </Text>
              {selectedKaryawan === null && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={COLORS.primary}
                />
              )}
            </TouchableOpacity>

            {isLoadingEmployees ? (
              <View className="py-6 items-center">
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text className="font-sans text-xs text-slate-500 mt-2">
                  Memuat daftar karyawan...
                </Text>
              </View>
            ) : availableEmployees.length === 0 ? (
              <View className="py-6 items-center">
                <Text className="font-sans text-xs text-slate-500">
                  Karyawan tidak ditemukan.
                </Text>
              </View>
            ) : (
              <ScrollView className="max-h-72">
                {availableEmployees.map((emp) => {
                  const isSelected = selectedKaryawan?.id === emp.id;

                  return (
                    <TouchableOpacity
                      key={emp.id}
                      className={`p-3 rounded-xl border mb-2 flex-row items-center justify-between ${
                        isSelected
                          ? "bg-amber-50 border-amber-300"
                          : "bg-slate-50 border-slate-200"
                      }`}
                      onPress={() => {
                        setSelectedKaryawan(emp);
                        setIsPickerOpen(false);
                      }}
                      testID={`option-karyawan-${emp.id}`}
                    >
                      <View className="flex-1 pr-2">
                        <Text className="font-sans-bold text-xs text-slate-900">
                          {emp.nama}
                        </Text>
                        <Text className="font-sans text-[11px] text-slate-500">
                          {emp.email}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={COLORS.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
