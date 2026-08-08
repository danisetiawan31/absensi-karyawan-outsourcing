import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '@/constants/theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    testID?: string;
  };
  testID?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  rightAction,
  testID = 'screen-header',
}: ScreenHeaderProps) {
  return (
    <View
      className="border-b border-slate-200 bg-white px-6 pb-4 pt-12 shadow-xs flex-row items-center justify-between"
      testID={testID}
    >
      <View className="flex-1 pr-3">
        <Text className="font-sans-bold text-xl text-slate-900">{title}</Text>
        {subtitle && (
          <Text className="font-sans text-xs text-slate-500 mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>
      {rightAction && (
        <TouchableOpacity
          className="bg-primary px-4 py-2.5 rounded-xl flex-row items-center shadow-xs active:opacity-80"
          onPress={rightAction.onPress}
          testID={rightAction.testID || 'header-right-action'}
        >
          {rightAction.icon && (
            <Ionicons name={rightAction.icon} size={18} color={COLORS.onPrimary} />
          )}
          <Text className="ml-1 font-sans-bold text-xs text-on-primary">
            {rightAction.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
