import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
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
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { COLORS } from '@/constants/theme';
import {
  downloadAndOpenReport,
  getAttendanceSummary,
} from '@/services/reports.service';
import { AttendanceSummaryItem, ReportFormat } from '@/types/reports';
import { formatJakartaYmd } from '@/utils/date.util';

import { AttendanceAttemptsModal } from './AttendanceAttemptsModal';

export function getDefault30DaysPeriodDates(nowDate: Date = new Date()): {
  dateMulai: Date;
  dateSelesai: Date;
} {
  const dateSelesai = nowDate;
  const dateMulai = new Date(nowDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { dateMulai, dateSelesai };
}

export function isPeriodValid(
  dateMulai: Date | null,
  dateSelesai: Date | null,
): boolean {
  if (!dateMulai || !dateSelesai) return false;
  return dateMulai.getTime() <= dateSelesai.getTime();
}

export function createDrillDownState(
  karyawanId: string,
  nama: string,
): { id: string; nama: string } {
  return { id: karyawanId, nama };
}

export function closeDrillDownState(): null {
  return null;
}

interface MetricTileProps {
  label: string;
  count: number;
  bgClass: string;
  textClass: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  testID?: string;
}

function MetricTile({
  label,
  count,
  bgClass,
  textClass,
  iconName,
  iconColor,
  testID,
}: MetricTileProps) {
  return (
    <View
      className={`flex-1 p-2.5 rounded-xl border border-slate-100 ${bgClass} flex-row items-center justify-between min-w-[45%]`}
      testID={testID}
    >
      <View className="flex-row items-center gap-1.5 flex-1 pr-1">
        <Ionicons name={iconName} size={14} color={iconColor} />
        <Text className={`font-sans-medium text-[11px] ${textClass}`} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text className={`font-sans-bold text-xs ${textClass}`}>{count}</Text>
    </View>
  );
}

export default function HrAdminReportsScreen() {
  const initialPeriod = useMemo(() => getDefault30DaysPeriodDates(), []);

  const [dateMulai, setDateMulai] = useState<Date | null>(
    initialPeriod.dateMulai,
  );
  const [dateSelesai, setDateSelesai] = useState<Date | null>(
    initialPeriod.dateSelesai,
  );

  const [exportingFormat, setExportingFormat] = useState<ReportFormat | null>(
    null,
  );
  const [exportError, setExportError] = useState<string | null>(null);

  const [selectedDrillDownEmployee, setSelectedDrillDownEmployee] = useState<{
    id: string;
    nama: string;
  } | null>(null);

  const validPeriod = isPeriodValid(dateMulai, dateSelesai);
  const periodeMulaiStr = dateMulai ? formatJakartaYmd(dateMulai) : '';
  const periodeSelesaiStr = dateSelesai ? formatJakartaYmd(dateSelesai) : '';

  // Fetch Attendance Summary
  const {
    data: summaryItems = [],
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    refetch: refetchSummary,
    isRefetching,
  } = useQuery({
    queryKey: ['attendance-summary', periodeMulaiStr, periodeSelesaiStr],
    queryFn: () => getAttendanceSummary(periodeMulaiStr, periodeSelesaiStr),
    enabled: validPeriod && Boolean(periodeMulaiStr && periodeSelesaiStr),
  });



  const handleExport = async (format: ReportFormat) => {
    if (!validPeriod || !periodeMulaiStr || !periodeSelesaiStr) return;
    setExportingFormat(format);
    setExportError(null);

    try {
      await downloadAndOpenReport(format, periodeMulaiStr, periodeSelesaiStr);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Gagal mengunduh file laporan.';
      setExportError(msg);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Laporan & Rekap Kehadiran"
        subtitle="Ringkasan & export laporan kehadiran karyawan"
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchSummary}
            colors={[COLORS.primary]}
          />
        }
      >
        {exportError && (
          <AlertBanner
            type="error"
            message={exportError}
            testID="banner-export-error"
          />
        )}

        {/* Filter Periode Section */}
        <SectionCard className="p-4 gap-3 mb-4" testID="section-filters">
          <DateRangeFilter
            dateMulai={dateMulai}
            dateSelesai={dateSelesai}
            onDateMulaiChange={setDateMulai}
            onDateSelesaiChange={setDateSelesai}
            allowEmpty={false}
            title="Filter Periode (Wajib)"
            resetLabel="Reset 30 Hari"
            showInvalidHint={true}
            isPeriodValid={validPeriod}
            onReset={() => {
              const def = getDefault30DaysPeriodDates();
              setDateMulai(def.dateMulai);
              setDateSelesai(def.dateSelesai);
            }}
          />

          {/* Area Tombol Export (PDF & XLSX) */}
          <View className="flex-row gap-2 mt-2 pt-3 border-t border-slate-100">
            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl border ${
                !validPeriod || exportingFormat !== null
                  ? 'bg-slate-100 border-slate-200 opacity-60'
                  : 'bg-red-50 border-red-200 active:bg-red-100'
              }`}
              disabled={!validPeriod || exportingFormat !== null}
              onPress={() => handleExport('pdf')}
              testID="button-export-pdf"
            >
              {exportingFormat === 'pdf' ? (
                <ActivityIndicator size="small" color={COLORS.destructive} />
              ) : (
                <>
                  <Ionicons name="document-text" size={16} color={COLORS.destructive} />
                  <Text className="font-sans-bold text-xs text-red-700 ml-1.5">
                    Export PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl border ${
                !validPeriod || exportingFormat !== null
                  ? 'bg-slate-100 border-slate-200 opacity-60'
                  : 'bg-emerald-50 border-emerald-200 active:bg-emerald-100'
              }`}
              disabled={!validPeriod || exportingFormat !== null}
              onPress={() => handleExport('xlsx')}
              testID="button-export-xlsx"
            >
              {exportingFormat === 'xlsx' ? (
                <ActivityIndicator size="small" color={COLORS.successText} />
              ) : (
                <>
                  <Ionicons name="stats-chart" size={16} color={COLORS.successText} />
                  <Text className="font-sans-bold text-xs text-emerald-800 ml-1.5">
                    Export XLSX
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* Content List Summary */}
        {!validPeriod ? (
          <EmptyState
            title="Periode Belum Lengkap"
            description="Silakan atur rentang tanggal periode yang valid untuk menampilkan ringkasan rekap."
            testID="empty-state-invalid-period"
          />
        ) : isLoadingSummary ? (
          <LoadingState message="Memuat ringkasan rekap..." />
        ) : isErrorSummary ? (
          <ErrorState
            title="Gagal Memuat Rekap"
            message="Terjadi kesalahan saat mengambil data ringkasan kehadiran."
            onRetry={refetchSummary}
          />
        ) : summaryItems.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Rekap"
            description="Tidak ditemukan data kehadiran karyawan pada periode ini."
            testID="empty-state-summary"
          />
        ) : (
          <View className="gap-3">
            {summaryItems.map((item: AttendanceSummaryItem) => (
              <TouchableOpacity
                key={item.karyawanId}
                onPress={() =>
                  setSelectedDrillDownEmployee(
                    createDrillDownState(item.karyawanId, item.nama),
                  )
                }
                activeOpacity={0.8}
                testID={`card-summary-${item.karyawanId}`}
              >
                <SectionCard className="p-4 gap-3">
                  {/* Header Card: Nama Karyawan & Badge Total Shift */}
                  <View className="flex-row items-center justify-between border-b border-slate-100 pb-2.5">
                    <View className="flex-1 pr-2 flex-row items-center gap-1.5">
                      <Text className="font-sans-bold text-sm text-slate-900">
                        {item.nama}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
                    </View>
                    <View className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                      <Text className="font-sans-bold text-[11px] text-slate-700">
                        Total: {item.totalJadwal} Shift
                      </Text>
                    </View>
                  </View>

                  {/* Grid Metric 2x3 (6 Metrik): Total Hadir, Terlambat, Tidak Hadir, Izin, Belum, Total Jadwal */}
                  <View className="gap-2">
                    <View className="flex-row gap-2">
                      <MetricTile
                        label="Hadir"
                        count={item.totalHadir}
                        bgClass="bg-[#DCFCE7]"
                        textClass="text-[#166534]"
                        iconName="checkmark-circle-outline"
                        iconColor="#166534"
                        testID={`metric-hadir-${item.karyawanId}`}
                      />
                      <MetricTile
                        label="Terlambat"
                        count={item.totalTerlambat}
                        bgClass="bg-[#FFEDD5]"
                        textClass="text-[#9A3412]"
                        iconName="time-outline"
                        iconColor="#EA580C"
                        testID={`metric-terlambat-${item.karyawanId}`}
                      />
                    </View>

                    <View className="flex-row gap-2">
                      <MetricTile
                        label="Tidak Hadir"
                        count={item.totalTidakHadir}
                        bgClass="bg-[#FEE2E2]"
                        textClass="text-[#991B1B]"
                        iconName="close-circle-outline"
                        iconColor="#DC2626"
                        testID={`metric-tidak-hadir-${item.karyawanId}`}
                      />
                      <MetricTile
                        label="Izin"
                        count={item.totalIzin}
                        bgClass="bg-[#DBEAFE]"
                        textClass="text-[#1E40AF]"
                        iconName="document-text-outline"
                        iconColor="#2563EB"
                        testID={`metric-izin-${item.karyawanId}`}
                      />
                    </View>

                    <View className="flex-row gap-2">
                      <MetricTile
                        label="Belum"
                        count={item.totalBelum}
                        bgClass="bg-[#F1F5F9]"
                        textClass="text-[#475569]"
                        iconName="help-circle-outline"
                        iconColor={COLORS.muted}
                        testID={`metric-belum-${item.karyawanId}`}
                      />
                      <MetricTile
                        label="Total Shift"
                        count={item.totalJadwal}
                        bgClass="bg-white border-slate-200"
                        textClass="text-slate-900"
                        iconName="calendar-outline"
                        iconColor={COLORS.muted}
                        testID={`metric-total-jadwal-${item.karyawanId}`}
                      />
                    </View>
                  </View>
                </SectionCard>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Drill-down Modal Percobaan Absensi */}
      <AttendanceAttemptsModal
        visible={selectedDrillDownEmployee !== null}
        onClose={() => setSelectedDrillDownEmployee(null)}
        karyawanId={selectedDrillDownEmployee?.id || null}
        karyawanNama={selectedDrillDownEmployee?.nama || null}
        periodeMulai={periodeMulaiStr}
        periodeSelesai={periodeSelesaiStr}
      />
    </View>
  );
}
