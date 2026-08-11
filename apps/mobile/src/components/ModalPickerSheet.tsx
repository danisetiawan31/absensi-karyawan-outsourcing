import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AlertBanner } from '@/components/AlertBanner';
import { SearchInput } from '@/components/SearchInput';
import { COLORS } from '@/constants/theme';

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) {
    return `rgba(255, 200, 30, ${alpha})`;
  }
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface ModalPickerSheetProps<T> {
  visible: boolean;
  onClose: () => void;
  title: string;
  closeTestID?: string;
  error?: string | null;
  errorTestID?: string;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchPlaceholder?: string;
  searchTestID?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  selectedId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  allOptionLabel?: string;
  allOptionTestID?: string;
  onSelectAllOption?: () => void;
  isAllOptionSelected?: boolean;
  modalTestID?: string;
  scrollViewMaxHeightClass?: string;
}

export function ModalPickerSheet<T>({
  visible,
  onClose,
  title,
  closeTestID = 'button-close-picker',
  error,
  errorTestID = 'banner-picker-error',
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder = 'Cari...',
  searchTestID = 'input-search-picker',
  isLoading = false,
  loadingMessage = 'Memuat data...',
  items,
  keyExtractor,
  renderItem,
  selectedId,
  emptyTitle = 'Tidak Ada Data',
  emptyDescription,
  emptyIcon = 'people-outline',
  allOptionLabel,
  allOptionTestID = 'option-all-items',
  onSelectAllOption,
  isAllOptionSelected = false,
  modalTestID = 'modal-picker-sheet',
  scrollViewMaxHeightClass = 'max-h-80',
}: ModalPickerSheetProps<T>) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID={modalTestID}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-2xl max-h-[80%] p-4">
          {/* Header & Close Button */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <Text className="font-sans-bold text-base text-slate-900">
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} testID={closeTestID}>
              <Ionicons name="close-circle" size={24} color={COLORS.slate400} />
            </TouchableOpacity>
          </View>

          {/* Optional Error Banner */}
          {error && (
            <View className="mt-3">
              <AlertBanner
                type="error"
                message={error}
                testID={errorTestID}
              />
            </View>
          )}

          {/* Search Input */}
          <SearchInput
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder={searchPlaceholder}
            testID={searchTestID}
            containerClassName="flex-row items-center bg-slate-100 px-3 py-2 rounded-xl mt-3 mb-3 border border-slate-200"
            iconSize={16}
          />

          {/* Optional "All Items" Option at top */}
          {allOptionLabel && onSelectAllOption && (
            <TouchableOpacity
              className={`p-3 rounded-xl border mb-2 flex-row items-center justify-between ${
                isAllOptionSelected ? '' : 'bg-slate-50 border-slate-200'
              }`}
              style={
                isAllOptionSelected
                  ? {
                      backgroundColor: hexToRgba(COLORS.primary, 0.15),
                      borderColor: COLORS.primary,
                    }
                  : undefined
              }
              onPress={onSelectAllOption}
              testID={allOptionTestID}
            >
              <Text
                className={`font-sans-bold text-xs ${
                  isAllOptionSelected ? 'text-slate-900' : 'text-slate-700'
                }`}
              >
                {allOptionLabel}
              </Text>
              {isAllOptionSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={COLORS.primary}
                />
              )}
            </TouchableOpacity>
          )}

          {/* Body Content */}
          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text className="font-sans text-xs text-slate-500 mt-2">
                {loadingMessage}
              </Text>
            </View>
          ) : items.length === 0 ? (
            <View className="py-8 items-center px-4">
              <Ionicons name={emptyIcon} size={32} color={COLORS.slate400} />
              <Text className="font-sans-semibold text-xs text-slate-700 text-center mt-2">
                {emptyTitle}
              </Text>
              {emptyDescription ? (
                <Text className="font-sans text-[11px] text-slate-500 text-center mt-1">
                  {emptyDescription}
                </Text>
              ) : null}
            </View>
          ) : (
            <ScrollView className={scrollViewMaxHeightClass}>
              {items.map((item) => {
                const key = keyExtractor(item);
                const isSelected = selectedId ? selectedId === key : false;
                return renderItem(item, isSelected);
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
