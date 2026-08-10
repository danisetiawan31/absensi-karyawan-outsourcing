import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

import { COLORS } from '@/constants/theme';

export interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
  clearTestID?: string;
  containerClassName?: string;
  inputClassName?: string;
  iconSize?: number;
  showClearButton?: boolean;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Cari...',
  testID = 'input-search',
  clearTestID = 'button-clear-search',
  containerClassName = 'flex-row items-center px-3 py-2 bg-slate-100 rounded-xl border border-slate-200',
  inputClassName = '',
  iconSize = 18,
  showClearButton = true,
}: SearchInputProps) {
  const hasValue = value.length > 0;

  return (
    <View className={containerClassName}>
      <Ionicons name="search-outline" size={iconSize} color={COLORS.muted} />
      <TextInput
        className={`flex-1 ml-2 font-sans text-xs text-slate-900 ${inputClassName}`.trim()}
        placeholder={placeholder}
        placeholderTextColor={COLORS.slate400}
        value={value}
        onChangeText={onChangeText}
        testID={testID}
      />
      {showClearButton && hasValue && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          testID={clearTestID}
        >
          <Ionicons name="close-circle" size={16} color={COLORS.slate400} />
        </TouchableOpacity>
      )}
    </View>
  );
}
