/**
 * StatusBadge — pill badge sesuai konvensi DESIGN.md § Status Kehadiran.
 *
 * Variant mapping (DESIGN.md):
 *   success     → bg #DCFCE7 / text #166534  (Hadir/Valid)
 *   warning     → bg #FFEDD5 / text #9A3412  (Terlambat)
 *   info        → bg #DBEAFE / text #1E40AF  (Izin)
 *   muted       → bg #F1F5F9 / text #475569  (Belum check-in)
 *   destructive → bg #FEE2E2 / text #991B1B  (Tidak hadir)
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export type StatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'destructive';

const VARIANT_STYLES: Record<
  StatusBadgeVariant,
  { bg: string; text: string; iconColor: string }
> = {
  success: {
    bg: 'bg-[#DCFCE7]',
    text: 'text-[#166534]',
    iconColor: '#166534',
  },
  warning: {
    bg: 'bg-[#FFEDD5]',
    text: 'text-[#9A3412]',
    iconColor: '#EA580C',
  },
  info: {
    bg: 'bg-[#DBEAFE]',
    text: 'text-[#1E40AF]',
    iconColor: '#2563EB',
  },
  muted: {
    bg: 'bg-[#F1F5F9]',
    text: 'text-[#475569]',
    iconColor: '#64748B',
  },
  destructive: {
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#991B1B]',
    iconColor: '#DC2626',
  },
};

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Ukuran ikon (default 12) */
  iconSize?: number;
  testID?: string;
}

export function StatusBadge({
  variant,
  label,
  icon,
  iconSize = 12,
  testID,
}: StatusBadgeProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <View
      className={`flex-row items-center self-start rounded-full border border-transparent px-3 py-1 ${styles.bg}`}
      testID={testID}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={iconSize}
          color={styles.iconColor}
          style={{ marginRight: 4 }}
        />
      )}
      <Text className={`font-sans-bold text-[11px] ${styles.text}`}>
        {label}
      </Text>
    </View>
  );
}
