import { getStatusIzinBadgeConfig } from '../status-izin-badge.util';

describe('status-izin-badge.util (getStatusIzinBadgeConfig)', () => {
  it('harus mengembalikan variant warning untuk status PENDING', () => {
    const config = getStatusIzinBadgeConfig('PENDING');
    expect(config.variant).toBe('warning');
    expect(config.label).toBe('Menunggu Persetujuan');
    expect(config.iconName).toBe('time-outline');
  });

  it('harus mengembalikan variant success untuk status APPROVED', () => {
    const config = getStatusIzinBadgeConfig('APPROVED');
    expect(config.variant).toBe('success');
    expect(config.label).toBe('Disetujui');
    expect(config.iconName).toBe('checkmark-circle-outline');
  });

  it('harus mengembalikan variant destructive untuk status REJECTED', () => {
    const config = getStatusIzinBadgeConfig('REJECTED');
    expect(config.variant).toBe('destructive');
    expect(config.label).toBe('Ditolak');
    expect(config.iconName).toBe('close-circle-outline');
  });

  it('harus mengembalikan variant muted untuk status CANCELLED', () => {
    const config = getStatusIzinBadgeConfig('CANCELLED');
    expect(config.variant).toBe('muted');
    expect(config.label).toBe('Dibatalkan');
    expect(config.iconName).toBe('ban-outline');
  });
});
