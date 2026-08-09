import {
  DashboardAttendanceStatus,
} from '@/types/dashboard';
import { getDashboardStatusBadgeConfig } from '../SupervisorHomeScreen';

describe('SupervisorHomeScreen Unit Tests', () => {
  describe('1. StatusBadge Mapping (5 Kombinasi Status)', () => {
    it('HADIR -> variant success, label Hadir', () => {
      const config = getDashboardStatusBadgeConfig('HADIR');
      expect(config.variant).toBe('success');
      expect(config.label).toBe('Hadir');
      expect(config.iconName).toBe('checkmark-circle-outline');
    });

    it('TERLAMBAT -> variant warning, label Terlambat', () => {
      const config = getDashboardStatusBadgeConfig('TERLAMBAT');
      expect(config.variant).toBe('warning');
      expect(config.label).toBe('Terlambat');
      expect(config.iconName).toBe('alert-circle-outline');
    });

    it('IZIN -> variant info, label Izin / Cuti', () => {
      const config = getDashboardStatusBadgeConfig('IZIN');
      expect(config.variant).toBe('info');
      expect(config.label).toBe('Izin / Cuti');
      expect(config.iconName).toBe('document-text-outline');
    });

    it('TIDAK_HADIR -> variant destructive, label Tidak Hadir', () => {
      const config = getDashboardStatusBadgeConfig('TIDAK_HADIR');
      expect(config.variant).toBe('destructive');
      expect(config.label).toBe('Tidak Hadir');
      expect(config.iconName).toBe('close-circle-outline');
    });

    it('BELUM -> variant muted, label Belum Absen', () => {
      const config = getDashboardStatusBadgeConfig('BELUM');
      expect(config.variant).toBe('muted');
      expect(config.label).toBe('Belum Absen');
      expect(config.iconName).toBe('time-outline');
    });

    it('Fallback status tak dikenal -> variant muted', () => {
      const config = getDashboardStatusBadgeConfig('UNKNOWN_STATUS' as DashboardAttendanceStatus);
      expect(config.variant).toBe('muted');
      expect(config.label).toBe('Belum Absen');
    });
  });
});
