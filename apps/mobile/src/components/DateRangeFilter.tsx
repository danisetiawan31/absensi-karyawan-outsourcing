import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '@/constants/theme';
import { formatJakartaDate } from '@/utils/date.util';

export function getPlaceholderText(allowEmpty: boolean): string {
  return allowEmpty ? 'Tanpa Batas' : 'Pilih Tanggal';
}

export function getHeaderTitle(title?: string, allowEmpty: boolean = false): string {
  return title || (allowEmpty ? 'Filter Periode' : 'Filter Periode (Wajib)');
}

export function getDefaultResetLabel(resetLabel?: string, allowEmpty: boolean = false): string {
  return resetLabel || (allowEmpty ? 'Reset Filter' : 'Reset 30 Hari');
}

export interface DateRangeFilterProps {
  dateMulai: Date | null;
  dateSelesai: Date | null;
  onDateMulaiChange: (date: Date | null) => void;
  onDateSelesaiChange: (date: Date | null) => void;
  onReset?: () => void;
  allowEmpty?: boolean;
  title?: string;
  resetLabel?: string;
  showRequiredAsterisk?: boolean;
  showInvalidHint?: boolean;
  isPeriodValid?: boolean;
  testIDPrefix?: string;
}

export function DateRangeFilter({
  dateMulai,
  dateSelesai,
  onDateMulaiChange,
  onDateSelesaiChange,
  onReset,
  allowEmpty = false,
  title,
  resetLabel,
  showRequiredAsterisk = !allowEmpty,
  showInvalidHint = false,
  isPeriodValid = true,
  testIDPrefix = '',
}: DateRangeFilterProps) {
  const [showPickerMulai, setShowPickerMulai] = useState(false);
  const [showPickerSelesai, setShowPickerSelesai] = useState(false);

  const handleDateMulaiChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowPickerMulai(Platform.OS === 'ios');
    if (selectedDate) {
      onDateMulaiChange(selectedDate);
    }
  };

  const handleDateSelesaiChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowPickerSelesai(Platform.OS === 'ios');
    if (selectedDate) {
      onDateSelesaiChange(selectedDate);
    }
  };

  const isFilterActive = dateMulai !== null || dateSelesai !== null;
  const headerTitle = getHeaderTitle(title, allowEmpty);
  const finalResetLabel = getDefaultResetLabel(resetLabel, allowEmpty);
  const placeholderText = getPlaceholderText(allowEmpty);

  const prefix = testIDPrefix ? `${testIDPrefix}` : '';

  return (
    <View className="gap-3">
      {/* Header Title & Reset Button */}
      <View className="flex-row items-center justify-between border-b border-slate-100 pb-2">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
          <Text className="font-sans-bold text-xs text-slate-800">
            {headerTitle}
          </Text>
        </View>
        {isFilterActive && onReset && (
          <TouchableOpacity
            onPress={onReset}
            testID={prefix ? `${prefix}-button-reset-period` : 'button-reset-period'}
          >
            <Text className="font-sans-semibold text-[11px] text-amber-600">
              {finalResetLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date Triggers Row */}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
            Periode Mulai{showRequiredAsterisk && <Text className="text-destructive"> *</Text>}
          </Text>
          <TouchableOpacity
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex-row items-center justify-between"
            onPress={() => setShowPickerMulai(true)}
            testID={prefix ? `${prefix}-button-pick-periode-mulai` : 'button-pick-periode-mulai'}
          >
            <Text className="font-sans text-xs text-slate-900">
              {dateMulai ? formatJakartaDate(dateMulai) : placeholderText}
            </Text>
            <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <Text className="font-sans-semibold text-xs text-slate-700 mb-1">
            Periode Selesai{showRequiredAsterisk && <Text className="text-destructive"> *</Text>}
          </Text>
          <TouchableOpacity
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex-row items-center justify-between"
            onPress={() => setShowPickerSelesai(true)}
            testID={prefix ? `${prefix}-button-pick-periode-selesai` : 'button-pick-periode-selesai'}
          >
            <Text className="font-sans text-xs text-slate-900">
              {dateSelesai ? formatJakartaDate(dateSelesai) : placeholderText}
            </Text>
            <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Native DateTimePickers */}
      {showPickerMulai && (
        <DateTimePicker
          value={dateMulai || new Date()}
          mode="date"
          display="default"
          onChange={handleDateMulaiChange}
          testID={prefix ? `${prefix}-picker-periode-mulai` : 'picker-periode-mulai'}
        />
      )}

      {showPickerSelesai && (
        <DateTimePicker
          value={dateSelesai || new Date()}
          mode="date"
          display="default"
          onChange={handleDateSelesaiChange}
          testID={prefix ? `${prefix}-picker-periode-selesai` : 'picker-periode-selesai'}
        />
      )}

      {/* Invalid Period Hint */}
      {showInvalidHint && !isPeriodValid && (
        <Text
          className="font-sans text-[11px] text-destructive mt-1"
          testID={prefix ? `${prefix}-text-invalid-period-hint` : 'text-invalid-period-hint'}
        >
          Periode tanggal tidak valid. Tanggal mulai harus sebelum atau sama dengan tanggal selesai.
        </Text>
      )}
    </View>
  );
}
