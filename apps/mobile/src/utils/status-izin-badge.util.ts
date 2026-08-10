import { Ionicons } from '@expo/vector-icons';
import { StatusBadgeVariant } from '@/components/StatusBadge';
import { StatusIzin } from '@/types/leave-request';

export interface StatusIzinBadgeConfig {
  variant: StatusBadgeVariant;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

export function getStatusIzinBadgeConfig(
  status: StatusIzin,
): StatusIzinBadgeConfig {
  switch (status) {
    case 'PENDING':
      return {
        variant: 'warning',
        label: 'Menunggu Persetujuan',
        iconName: 'time-outline',
      };
    case 'APPROVED':
      return {
        variant: 'success',
        label: 'Disetujui',
        iconName: 'checkmark-circle-outline',
      };
    case 'REJECTED':
      return {
        variant: 'destructive',
        label: 'Ditolak',
        iconName: 'close-circle-outline',
      };
    case 'CANCELLED':
      return {
        variant: 'muted',
        label: 'Dibatalkan',
        iconName: 'ban-outline',
      };
  }
}
