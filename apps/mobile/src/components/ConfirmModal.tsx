import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '@/constants/theme';

export type ConfirmModalVariant = 'danger' | 'warning' | 'info';

export interface ConfirmModalProps {
  visible: boolean;
  variant?: ConfirmModalVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

export const CONFIRM_MODAL_VARIANT_CONFIG: Record<
  ConfirmModalVariant,
  {
    iconBgClass: string;
    iconColor: string;
    defaultIcon: keyof typeof Ionicons.glyphMap;
    confirmBtnClass: string;
    confirmTextClass: string;
  }
> = {
  danger: {
    iconBgClass: 'bg-destructive-bg',
    iconColor: COLORS.destructive,
    defaultIcon: 'alert-circle-outline',
    confirmBtnClass: 'bg-destructive',
    confirmTextClass: 'text-white',
  },
  warning: {
    iconBgClass: 'bg-warning-bg',
    iconColor: COLORS.warning,
    defaultIcon: 'warning-outline',
    confirmBtnClass: 'bg-warning',
    confirmTextClass: 'text-white',
  },
  info: {
    iconBgClass: 'bg-info-bg',
    iconColor: COLORS.info,
    defaultIcon: 'information-circle-outline',
    confirmBtnClass: 'bg-info',
    confirmTextClass: 'text-white',
  },
};

export function ConfirmModal({
  visible,
  variant = 'danger',
  icon,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  testID = 'confirm-modal',
}: ConfirmModalProps) {
  if (!visible) return null;

  const config = CONFIRM_MODAL_VARIANT_CONFIG[variant];
  const activeIcon = icon || config.defaultIcon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID={testID}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <View className="items-center mb-3">
            <View
              className={`h-12 w-12 items-center justify-center rounded-full ${config.iconBgClass} mb-2`}
            >
              <Ionicons name={activeIcon} size={28} color={config.iconColor} />
            </View>
            <Text className="font-sans-bold text-base text-slate-900 text-center">
              {title}
            </Text>
            <Text className="font-sans text-xs text-slate-500 text-center mt-1 leading-5">
              {description}
            </Text>
          </View>

          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl border border-slate-200 bg-slate-100 items-center"
              onPress={onCancel}
              testID="button-cancel-modal"
            >
              <Text className="font-sans-semibold text-xs text-slate-700">
                {cancelText}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 rounded-xl items-center shadow-xs ${config.confirmBtnClass}`}
              onPress={onConfirm}
              testID="button-confirm-modal"
            >
              <Text
                className={`font-sans-bold text-xs ${config.confirmTextClass}`}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
