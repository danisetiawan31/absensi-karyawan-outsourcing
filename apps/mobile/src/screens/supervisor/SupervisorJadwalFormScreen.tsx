import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { COLORS } from '@/constants/theme';
import { getAvailableEmployees } from '@/services/employees.service';
import {
  createSchedule,
  getSchedules,
  updateSchedule,
} from '@/services/schedules.service';
import { getSupervisorSites } from '@/services/supervisor-sites.service';
import { AvailableEmployee } from '@/types/employee';
import { CreateSchedulePayload, ScheduleItem } from '@/types/schedule';
import { SupervisorSiteItem } from '@/types/supervisor-site';
import {
  formatJakartaDate,
  formatJakartaYmd,
} from '@/utils/date.util';

export function calculateShiftDurationHours(
  jamMulaiStr: string,
  jamSelesaiStr: string,
): number {
  const [startH, startM] = jamMulaiStr.split(':').map(Number);
  const [endH, endM] = jamSelesaiStr.split(':').map(Number);

  const startTotalMins = startH * 60 + startM;
  let endTotalMins = endH * 60 + endM;

  if (endTotalMins < startTotalMins) {
    endTotalMins += 24 * 60;
  }

  return (endTotalMins - startTotalMins) / 60;
}

export function validateScheduleForm(
  karyawanId: string,
  siteId: string,
  tanggal: string,
  jamMulai: string,
  jamSelesai: string,
): { isValid: boolean; errorMessage?: string } {
  if (!siteId) {
    return { isValid: false, errorMessage: 'Lokasi site wajib dipilih.' };
  }
  if (!karyawanId) {
    return { isValid: false, errorMessage: 'Karyawan wajib dipilih.' };
  }
  if (!tanggal) {
    return { isValid: false, errorMessage: 'Tanggal shift wajib dipilih.' };
  }

  const durationHours = calculateShiftDurationHours(jamMulai, jamSelesai);
  if (durationHours <= 0 || durationHours > 16) {
    return {
      isValid: false,
      errorMessage:
        'Durasi shift tidak valid (harus lebih dari 0 dan maksimal 16 jam). Mohon periksa kembali jam mulai dan jam selesai.',
    };
  }

  return { isValid: true };
}

export interface ProcessScheduleSubmitParams {
  isEditMode: boolean;
  id?: string;
  karyawanId: string;
  siteId: string;
  tanggalYmd: string;
  jamMulai: string;
  jamSelesai: string;
  isSubmittingRef: React.MutableRefObject<boolean>;
  submitFn: (payload: CreateSchedulePayload) => Promise<any>;
  updateFn?: (
    id: string,
    payload: Partial<CreateSchedulePayload>,
  ) => Promise<any>;
  invalidateQueriesFn: () => Promise<void> | void;
  navigateBackFn: () => void;
}

export interface ProcessScheduleSubmitResult {
  success: boolean;
  errorMessage?: string;
}

export async function processScheduleSubmit(
  params: ProcessScheduleSubmitParams,
): Promise<ProcessScheduleSubmitResult> {
  const {
    isEditMode,
    id,
    karyawanId,
    siteId,
    tanggalYmd,
    jamMulai,
    jamSelesai,
    isSubmittingRef,
    submitFn,
    updateFn,
    invalidateQueriesFn,
    navigateBackFn,
  } = params;

  if (isSubmittingRef.current) {
    return { success: false };
  }

  const validation = validateScheduleForm(
    karyawanId,
    siteId,
    tanggalYmd,
    jamMulai,
    jamSelesai,
  );

  if (!validation.isValid) {
    return {
      success: false,
      errorMessage: validation.errorMessage || 'Form tidak valid.',
    };
  }

  isSubmittingRef.current = true;

  const payload: CreateSchedulePayload = {
    karyawanId,
    siteId,
    tanggal: tanggalYmd,
    jamMulai,
    jamSelesai,
  };

  try {
    if (isEditMode && id && updateFn) {
      await updateFn(id, payload);
    } else {
      await submitFn(payload);
    }

    await invalidateQueriesFn();
    navigateBackFn();
    return { success: true };
  } catch (err: unknown) {
    let message = 'Gagal menyimpan jadwal shift. Silakan coba lagi.';
    if (axios.isAxiosError(err)) {
      message = err.response?.data?.error?.message || message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    return { success: false, errorMessage: message };
  } finally {
    isSubmittingRef.current = false;
  }
}

export function getInitialSelectedDate(tanggalParam?: string): Date {
  if (tanggalParam) {
    const parsed = new Date(tanggalParam);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

export default function SupervisorJadwalFormScreen() {
  const queryClient = useQueryClient();
  const { id, tanggal } = useLocalSearchParams<{
    id?: string;
    tanggal?: string;
  }>();
  const isEditMode = Boolean(id);

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    getInitialSelectedDate(tanggal),
  );
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedKaryawanId, setSelectedKaryawanId] = useState<string>('');
  const [jamMulai, setJamMulai] = useState<string>('08:00');
  const [jamSelesai, setJamSelesai] = useState<string>('16:00');

  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showJamMulaiPicker, setShowJamMulaiPicker] = useState(false);
  const [showJamSelesaiPicker, setShowJamSelesaiPicker] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const tanggalYmd = formatJakartaYmd(selectedDate);
  const tanggalDisplay = formatJakartaDate(selectedDate);

  // Fetch Supervisor Sites
  const { data: sites = [] } = useQuery({
    queryKey: ['supervisor-sites'],
    queryFn: getSupervisorSites,
  });

  // Auto-select site if only 1 site is supervised
  useEffect(() => {
    if (sites.length === 1 && !selectedSiteId) {
      setSelectedSiteId(sites[0].site.id);
    }
  }, [sites, selectedSiteId]);

  // Fetch Existing Schedule when in edit mode
  const { data: existingSchedules = [] } = useQuery({
    queryKey: ['supervisor-schedules', tanggalYmd, selectedSiteId],
    queryFn: () => getSchedules(tanggalYmd, selectedSiteId),
    enabled: isEditMode && Boolean(id),
  });

  useEffect(() => {
    if (isEditMode && id && existingSchedules.length > 0) {
      const target = existingSchedules.find((s) => s.id === id);
      if (target) {
        if (target.karyawan) {
          setSelectedKaryawanId(target.karyawan.id);
        }
        if (target.site) {
          setSelectedSiteId(target.site.id);
        }
        if (target.tanggal) {
          setSelectedDate(new Date(target.tanggal));
        }
        if (target.jamMulai) {
          const startDate = new Date(target.jamMulai);
          const h = String(startDate.getHours()).padStart(2, '0');
          const m = String(startDate.getMinutes()).padStart(2, '0');
          setJamMulai(`${h}:${m}`);
        }
        if (target.jamSelesai) {
          const endDate = new Date(target.jamSelesai);
          const h = String(endDate.getHours()).padStart(2, '0');
          const m = String(endDate.getMinutes()).padStart(2, '0');
          setJamSelesai(`${h}:${m}`);
        }
      }
    }
  }, [isEditMode, id, existingSchedules]);

  // Fetch Available Employees
  const { data: availableEmployees = [], isLoading: isLoadingAvailable } =
    useQuery({
      queryKey: ['available-employees', tanggalYmd, selectedSiteId],
      queryFn: () => getAvailableEmployees(tanggalYmd, selectedSiteId),
      enabled: Boolean(selectedSiteId),
    });

  // Search Filtered Employees
  const filteredEmployees = availableEmployees.filter((emp: AvailableEmployee) =>
    emp.nama.toLowerCase().includes(searchEmployeeQuery.toLowerCase()),
  );

  const handleDateChange = (
    _event: DateTimePickerEvent,
    date?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleJamMulaiChange = (
    _event: DateTimePickerEvent,
    date?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowJamMulaiPicker(false);
    }
    if (date) {
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      setJamMulai(`${h}:${m}`);
    }
  };

  const handleJamSelesaiChange = (
    _event: DateTimePickerEvent,
    date?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowJamSelesaiPicker(false);
    }
    if (date) {
      const h = String(date.getHours()).padStart(2, '0');
      const m = String(date.getMinutes()).padStart(2, '0');
      setJamSelesai(`${h}:${m}`);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await processScheduleSubmit({
      isEditMode,
      id,
      karyawanId: selectedKaryawanId,
      siteId: selectedSiteId,
      tanggalYmd,
      jamMulai,
      jamSelesai,
      isSubmittingRef,
      submitFn: createSchedule,
      updateFn: updateSchedule,
      invalidateQueriesFn: async () => {
        queryClient.invalidateQueries({ queryKey: ['supervisor-schedules'] });
        queryClient.invalidateQueries({ queryKey: ['supervisor-attendance'] });
      },
      navigateBackFn: () => router.back(),
    });

    if (!result.success && result.errorMessage) {
      setErrorMessage(result.errorMessage);
    }
    setIsSubmitting(false);
  };

  const showSitePicker = sites.length > 1;

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title={isEditMode ? 'Edit Jadwal Shift' : 'Tambah Jadwal Shift'}
        subtitle="Isi informasi penugasan shift karyawan"
      />

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {errorMessage && (
          <AlertBanner
            type="error"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
            testID="error-alert-banner"
          />
        )}

        <SectionCard className="p-4 mb-4">
          {/* Site Selector (If >1 site) */}
          {showSitePicker ? (
            <View className="mb-4" testID="form-site-picker">
              <Text className="font-sans-medium text-xs text-slate-600 mb-1.5">
                Lokasi Site <Text className="text-destructive">*</Text>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                {sites.map((item: SupervisorSiteItem) => {
                  const isSelected = selectedSiteId === item.site.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      className={`mr-2 px-3.5 py-2 rounded-xl border ${
                        isSelected
                          ? 'bg-slate-900 border-slate-900'
                          : 'bg-white border-slate-200'
                      }`}
                      onPress={() => setSelectedSiteId(item.site.id)}
                      testID={`form-site-option-${item.site.id}`}
                    >
                      <Text
                        className={`font-sans-bold text-xs ${
                          isSelected ? 'text-white' : 'text-slate-700'
                        }`}
                      >
                        {item.site.nama}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View className="mb-4">
              <Text className="font-sans-medium text-xs text-slate-500">
                Lokasi Site
              </Text>
              <Text className="font-sans-bold text-sm text-slate-900 mt-1">
                {sites[0]?.site.nama || 'Site Terdaftar'}
              </Text>
            </View>
          )}

          {/* Date Picker */}
          <View className="mb-4">
            <Text className="font-sans-medium text-xs text-slate-600 mb-1.5">
              Tanggal Shift <Text className="text-destructive">*</Text>
            </Text>
            <TouchableOpacity
              className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex-row items-center justify-between"
              onPress={() => setShowDatePicker(true)}
              testID="button-pick-tanggal"
            >
              <Text className="font-sans-bold text-xs text-slate-800">
                {tanggalDisplay}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={COLORS.warning}
              />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              testID="form-date-picker"
            />
          )}

          {/* Time Picker Row */}
          <View className="flex-row gap-3 mb-4">
            {/* Jam Mulai */}
            <View className="flex-1">
              <Text className="font-sans-medium text-xs text-slate-600 mb-1.5">
                Jam Mulai <Text className="text-destructive">*</Text>
              </Text>
              <TouchableOpacity
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex-row items-center justify-between"
                onPress={() => setShowJamMulaiPicker(true)}
                testID="button-pick-jam-mulai"
              >
                <Text className="font-sans-bold text-xs text-slate-800">
                  {jamMulai}
                </Text>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            {/* Jam Selesai */}
            <View className="flex-1">
              <Text className="font-sans-medium text-xs text-slate-600 mb-1.5">
                Jam Selesai <Text className="text-destructive">*</Text>
              </Text>
              <TouchableOpacity
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex-row items-center justify-between"
                onPress={() => setShowJamSelesaiPicker(true)}
                testID="button-pick-jam-selesai"
              >
                <Text className="font-sans-bold text-xs text-slate-800">
                  {jamSelesai}
                </Text>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {showJamMulaiPicker && (
            <DateTimePicker
              value={new Date()}
              mode="time"
              is24Hour
              display="default"
              onChange={handleJamMulaiChange}
              testID="form-time-mulai-picker"
            />
          )}

          {showJamSelesaiPicker && (
            <DateTimePicker
              value={new Date()}
              mode="time"
              is24Hour
              display="default"
              onChange={handleJamSelesaiChange}
              testID="form-time-selesai-picker"
            />
          )}

          {/* Karyawan Picker & Search Input */}
          <View className="mb-2">
            <Text className="font-sans-medium text-xs text-slate-600 mb-1.5">
              Pilih Karyawan <Text className="text-destructive">*</Text>
            </Text>

            {/* Search Input */}
            <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 mb-2.5">
              <Ionicons name="search" size={16} color={COLORS.muted} />
              <TextInput
                className="ml-2 flex-1 font-sans text-xs text-slate-800 p-0"
                placeholder="Cari nama karyawan..."
                placeholderTextColor={COLORS.muted}
                value={searchEmployeeQuery}
                onChangeText={setSearchEmployeeQuery}
                testID="input-search-employee"
              />
              {searchEmployeeQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchEmployeeQuery('')}
                  testID="button-clear-search"
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Available Employee List */}
            {isLoadingAvailable ? (
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                className="py-3"
              />
            ) : filteredEmployees.length === 0 ? (
              <View className="p-3 rounded-xl bg-slate-100 items-center">
                <Text className="font-sans text-xs text-slate-500">
                  Tidak ada karyawan yang tersedia di tanggal/site ini.
                </Text>
              </View>
            ) : (
              <ScrollView
                className="max-h-44 rounded-xl border border-slate-200 bg-white"
                nestedScrollEnabled
                testID="employee-list-container"
              >
                {filteredEmployees.map((emp: AvailableEmployee) => {
                  const isSelected = selectedKaryawanId === emp.id;
                  return (
                    <TouchableOpacity
                      key={emp.id}
                      className={`p-3 border-b border-slate-100 flex-row items-center justify-between ${
                        isSelected ? 'bg-amber-50/70' : 'bg-white'
                      }`}
                      onPress={() => setSelectedKaryawanId(emp.id)}
                      testID={`employee-option-${emp.id}`}
                    >
                      <Text
                        className={`font-sans text-xs ${
                          isSelected
                            ? 'font-sans-bold text-amber-900'
                            : 'text-slate-700'
                        }`}
                      >
                        {emp.nama}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={COLORS.warning}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </SectionCard>

        {/* Submit Button */}
        <TouchableOpacity
          className={`py-3.5 rounded-xl items-center shadow-xs bg-primary ${
            isSubmitting ? 'opacity-70' : 'active:opacity-90'
          }`}
          onPress={handleSubmit}
          disabled={isSubmitting}
          testID="button-submit-schedule-form"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.onPrimary} />
          ) : (
            <Text className="font-sans-bold text-xs text-on-primary">
              {isEditMode ? 'Simpan Perubahan' : 'Buat Jadwal Shift'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
