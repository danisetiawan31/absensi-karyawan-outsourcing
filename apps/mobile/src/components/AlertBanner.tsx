import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '@/constants/theme';

export type AlertBannerType = 'success' | 'info' | 'warning' | 'error';

export interface AlertBannerProps {
  type: AlertBannerType;
  message: string;
  onDismiss?: () => void;
  action?: {
    label: string;
    onPress: () => void;
    testID?: string;
  };
  testID?: string;
}

export const ALERT_TYPE_CONFIG: Record<
  AlertBannerType,
  {
    containerClass: string;
    textClass: string;
    iconName: keyof typeof Ionicons.glyphMap;
    iconColor: string;
  }
> = {
  success: {
    containerClass: 'bg-success-bg border-success/30',
    textClass: 'text-success-text',
    iconName: 'checkmark-circle',
    iconColor: COLORS.success,
  },
  info: {
    containerClass: 'bg-info-bg border-info/30',
    textClass: 'text-info-text',
    iconName: 'information-circle',
    iconColor: COLORS.info,
  },
  warning: {
    containerClass: 'bg-warning-bg border-warning/30',
    textClass: 'text-warning-text',
    iconName: 'warning',
    iconColor: COLORS.warning,
  },
  error: {
    containerClass: 'bg-destructive-bg border-destructive/30',
    textClass: 'text-destructive-text',
    iconName: 'alert-circle',
    iconColor: COLORS.destructive,
  },
};

export function AlertBanner({
  type,
  message,
  onDismiss,
  action,
  testID = 'alert-banner',
}: AlertBannerProps) {
  const config = ALERT_TYPE_CONFIG[type];

  return (
    <View
      className={`mb-4 p-4 rounded-xl border flex-row items-center justify-between ${config.containerClass}`}
      testID={testID}
    >
      <View className="flex-row items-center flex-1 mr-2">
        <Ionicons name={config.iconName} size={20} color={config.iconColor} />
        <Text
          className={`ml-2 font-sans-medium text-xs flex-1 ${config.textClass}`}
        >
          {message}
        </Text>
      </View>

      <View className="flex-row items-center">
        {action && (
          <TouchableOpacity
            className="mr-2 px-3 py-1.5 rounded-lg bg-surface border border-slate-200 active:opacity-80"
            onPress={action.onPress}
            testID={action.testID || 'alert-banner-action'}
          >
            <Text className="font-sans-bold text-xs text-slate-800">
              {action.label}
            </Text>
          </TouchableOpacity>
        )}

        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            testID="button-dismiss-alert"
          >
            <Ionicons name="close" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
