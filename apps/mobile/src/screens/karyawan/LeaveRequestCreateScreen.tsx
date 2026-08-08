import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
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
import { createLeaveRequest } from '@/services/leave-requests.service';
import {
  CreateLeaveRequestResponse,
  JenisIzin,
  SelectedDocumentFile,
} from '@/types/leave-request';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

import {
  formatJakartaDate,
  formatJakartaYmd,
} from '@/utils/date.util';

export const formatDateToYmd = formatJakartaYmd;
export const formatDateDisplay = formatJakartaDate;

export function isDocumentRequired(
  jenis: JenisIzin,
  tanggalMulai: Date,
  tanggalSelesai: Date,
): boolean {
  if (jenis !== 'SAKIT') return false;

  const start = new Date(
    tanggalMulai.getFullYear(),
    tanggalMulai.getMonth(),
    tanggalMulai.getDate(),
  ).getTime();
  const end = new Date(
    tanggalSelesai.getFullYear(),
    tanggalSelesai.getMonth(),
    tanggalSelesai.getDate(),
  ).getTime();

  return end > start;
}

export interface LeaveRequestFormValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export function validateLeaveRequestForm(
  jenis: JenisIzin,
  tanggalMulai: Date,
  tanggalSelesai: Date,
  dokumen: SelectedDocumentFile | null,
): LeaveRequestFormValidationResult {
  const start = new Date(
    tanggalMulai.getFullYear(),
    tanggalMulai.getMonth(),
    tanggalMulai.getDate(),
  ).getTime();
  const end = new Date(
    tanggalSelesai.getFullYear(),
    tanggalSelesai.getMonth(),
    tanggalSelesai.getDate(),
  ).getTime();

  if (end < start) {
    return {
      isValid: false,
      errorMessage: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
    };
  }

  const docRequired = isDocumentRequired(jenis, tanggalMulai, tanggalSelesai);
  if (docRequired && !dokumen) {
    return {
      isValid: false,
      errorMessage:
        'Dokumen pendukung (surat dokter) wajib diunggah untuk izin sakit lebih dari 1 hari',
    };
  }

  if (dokumen && dokumen.size && dokumen.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      errorMessage: 'Ukuran dokumen tidak boleh melebihi 5MB',
    };
  }

  return { isValid: true };
}

export interface ProcessSubmitParams {
  jenis: JenisIzin;
  tanggalMulai: Date;
  tanggalSelesai: Date;
  alasan: string;
  dokumen: SelectedDocumentFile | null;
  isSubmittingRef: React.MutableRefObject<boolean>;
  submitFn: (
    tanggalMulai: string,
    tanggalSelesai: string,
    jenis: JenisIzin,
    alasan: string,
    dokumen?: SelectedDocumentFile,
  ) => Promise<CreateLeaveRequestResponse>;
  invalidateQueriesFn: () => Promise<void> | void;
  navigateBackFn: () => void;
}

export async function processLeaveRequestSubmit(
  params: ProcessSubmitParams,
): Promise<{ success: boolean; errorMessage?: string }> {
  if (params.isSubmittingRef.current) {
    return { success: false };
  }

  const validation = validateLeaveRequestForm(
    params.jenis,
    params.tanggalMulai,
    params.tanggalSelesai,
    params.dokumen,
  );

  if (!validation.isValid) {
    return { success: false, errorMessage: validation.errorMessage };
  }

  params.isSubmittingRef.current = true;

  try {
    const tglMulaiStr = formatDateToYmd(params.tanggalMulai);
    const tglSelesaiStr = formatDateToYmd(params.tanggalSelesai);

    await params.submitFn(
      tglMulaiStr,
      tglSelesaiStr,
      params.jenis,
      params.alasan,
      params.dokumen || undefined,
    );

    await params.invalidateQueriesFn();
    params.navigateBackFn();

    return { success: true };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
      return { success: false, errorMessage: err.response.data.error.message };
    }
    return {
      success: false,
      errorMessage: 'Gagal mengajukan izin. Silakan coba lagi.',
    };
  } finally {
    params.isSubmittingRef.current = false;
  }
}

export default function LeaveRequestCreateScreen() {
  const queryClient = useQueryClient();
  const isSubmittingRef = useRef(false);

  const [jenis, setJenis] = useState<JenisIzin>('SAKIT');
  const [tanggalMulai, setTanggalMulai] = useState<Date>(new Date());
  const [tanggalSelesai, setTanggalSelesai] = useState<Date>(new Date());
  const [alasan, setAlasan] = useState('');
  const [dokumen, setDokumen] = useState<SelectedDocumentFile | null>(null);

  const [showPickerMulai, setShowPickerMulai] = useState(false);
  const [showPickerSelesai, setShowPickerSelesai] = useState(false);
  const [isSubmittingUI, setIsSubmittingUI] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const docRequired = isDocumentRequired(jenis, tanggalMulai, tanggalSelesai);

  const handlePickDocument = async () => {
    setErrorMessage(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        if (asset.size && asset.size > MAX_FILE_SIZE_BYTES) {
          setErrorMessage('Ukuran dokumen tidak boleh melebihi 5MB');
          setDokumen(null);
          return;
        }

        setDokumen({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          type: asset.mimeType || 'application/pdf',
        });
      }
    } catch {
      setErrorMessage('Gagal memilih dokumen.');
    }
  };

  const handleFormSubmit = async () => {
    setErrorMessage(null);
    setIsSubmittingUI(true);

    const res = await processLeaveRequestSubmit({
      jenis,
      tanggalMulai,
      tanggalSelesai,
      alasan,
      dokumen,
      isSubmittingRef,
      submitFn: createLeaveRequest,
      invalidateQueriesFn: () =>
        queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
      navigateBackFn: () => router.replace('/(karyawan)/izin'),
    });

    setIsSubmittingUI(false);
    if (!res.success && res.errorMessage) {
      setErrorMessage(res.errorMessage);
    }
  };

  const handleDateMulaiChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowPickerMulai(Platform.OS === 'ios');
    if (selectedDate) {
      setTanggalMulai(selectedDate);
      if (selectedDate.getTime() > tanggalSelesai.getTime()) {
        setTanggalSelesai(selectedDate);
      }
    }
  };

  const handleDateSelesaiChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowPickerSelesai(Platform.OS === 'ios');
    if (selectedDate) {
      setTanggalSelesai(selectedDate);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        title="Ajukan Izin & Cuti"
        subtitle="Buat permohonan izin baru"
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
            testID="error-banner"
          />
        )}

        {/* Jenis Izin Selector */}
        <SectionCard className="p-5">
          <Text className="font-sans-bold text-xs text-slate-700 uppercase tracking-wider mb-3">
            Jenis Pengajuan <Text className="text-destructive">*</Text>
          </Text>
          <View className="flex-row gap-2">
            {(['SAKIT', 'IZIN', 'CUTI'] as JenisIzin[]).map((opt) => {
              const isSelected = jenis === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  className={`flex-1 py-3 rounded-xl items-center border ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'bg-slate-100 border-slate-200'
                  }`}
                  onPress={() => setJenis(opt)}
                  testID={`option-jenis-${opt.toLowerCase()}`}
                >
                  <Text
                    className={`font-sans-bold text-xs ${
                      isSelected ? 'text-on-primary' : 'text-slate-700'
                    }`}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        {/* Rentang Tanggal */}
        <SectionCard className="p-5">
          <Text className="font-sans-bold text-xs text-slate-700 uppercase tracking-wider mb-3">
            Rentang Tanggal <Text className="text-destructive">*</Text>
          </Text>

          <View className="flex-row gap-3">
            {/* Tanggal Mulai */}
            <View className="flex-1">
              <Text className="font-sans-medium text-xs text-slate-500 mb-1.5">
                Tanggal Mulai
              </Text>
              <TouchableOpacity
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex-row items-center justify-between"
                onPress={() => setShowPickerMulai(true)}
                testID="button-pick-tanggal-mulai"
              >
                <Text className="font-sans-bold text-xs text-slate-800">
                  {formatDateDisplay(tanggalMulai)}
                </Text>
                <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            {/* Tanggal Selesai */}
            <View className="flex-1">
              <Text className="font-sans-medium text-xs text-slate-500 mb-1.5">
                Tanggal Selesai
              </Text>
              <TouchableOpacity
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex-row items-center justify-between"
                onPress={() => setShowPickerSelesai(true)}
                testID="button-pick-tanggal-selesai"
              >
                <Text className="font-sans-bold text-xs text-slate-800">
                  {formatDateDisplay(tanggalSelesai)}
                </Text>
                <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {showPickerMulai && (
            <DateTimePicker
              value={tanggalMulai}
              mode="date"
              display="default"
              onChange={handleDateMulaiChange}
              testID="picker-tanggal-mulai"
            />
          )}

          {showPickerSelesai && (
            <DateTimePicker
              value={tanggalSelesai}
              mode="date"
              display="default"
              onChange={handleDateSelesaiChange}
              testID="picker-tanggal-selesai"
            />
          )}
        </SectionCard>

        {/* Alasan */}
        <SectionCard className="p-5">
          <Text className="font-sans-bold text-xs text-slate-700 uppercase tracking-wider mb-2">
            Alasan / Keterangan
          </Text>
          <TextInput
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 font-sans text-xs text-slate-800 h-24"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholder="Tuliskan alasan pengajuan..."
            placeholderTextColor={COLORS.slate400}
            value={alasan}
            onChangeText={setAlasan}
            testID="input-alasan"
          />
        </SectionCard>

        {/* Dokumen Lampiran */}
        <SectionCard className="p-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-sans-bold text-xs text-slate-700 uppercase tracking-wider">
              Dokumen Pendukung{' '}
              {docRequired ? (
                <Text className="text-destructive font-sans-bold">* (Wajib)</Text>
              ) : (
                <Text className="text-slate-400 font-sans">(Opsional)</Text>
              )}
            </Text>
          </View>

          <Text className="font-sans text-[11px] text-slate-500 mb-3">
            Format: PDF, JPG, PNG (Maks 5MB).
            {docRequired && ' Izin sakit lebih dari 1 hari wajib menyertakan surat dokter.'}
          </Text>

          {dokumen ? (
            <View className="p-3 rounded-xl border border-success/30 bg-success-bg flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Ionicons name="document-attach" size={20} color={COLORS.success} />
                <Text
                  className="ml-2 font-sans-semibold text-xs text-success-text flex-1"
                  numberOfLines={1}
                >
                  {dokumen.name || 'Dokumen Terpilih'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDokumen(null)}
                testID="button-remove-document"
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.destructive} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className={`p-4 rounded-xl border border-dashed flex-row items-center justify-center ${
                docRequired
                  ? 'border-warning/50 bg-warning-bg/40'
                  : 'border-slate-300 bg-slate-50'
              }`}
              onPress={handlePickDocument}
              testID="button-pick-document"
            >
              <Ionicons name="cloud-upload-outline" size={20} color={COLORS.muted} />
              <Text className="ml-2 font-sans-semibold text-xs text-slate-700">
                Pilih Dokumen
              </Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* Submit & Cancel Buttons */}
        <View className="flex-row gap-3 mt-2">
          <TouchableOpacity
            className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-white items-center active:opacity-80"
            onPress={() => router.replace('/(karyawan)/izin')}
            disabled={isSubmittingUI}
            testID="button-cancel-form"
          >
            <Text className="font-sans-bold text-xs text-slate-700">
              Batal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 py-3.5 rounded-xl bg-primary items-center shadow-xs active:opacity-80 flex-row justify-center"
            onPress={handleFormSubmit}
            disabled={isSubmittingUI}
            testID="button-submit-form"
          >
            {isSubmittingUI ? (
              <ActivityIndicator size="small" color={COLORS.onPrimary} />
            ) : (
              <Text className="font-sans-bold text-xs text-on-primary">
                Kirim Pengajuan
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
