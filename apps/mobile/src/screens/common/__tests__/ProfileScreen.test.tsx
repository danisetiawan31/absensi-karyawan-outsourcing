import { getInitials, getRoleBadgeLabel } from '../ProfileScreen';

describe('ProfileScreen Helpers Suite', () => {
  it('1. mengembalikan inisial 2 huruf dari nama lengkap', () => {
    expect(getInitials('Budi Santoso')).toBe('BS');
    expect(getInitials('Supervisor Central')).toBe('SC');
    expect(getInitials('Admin')).toBe('AD');
    expect(getInitials('')).toBe('U');
    expect(getInitials(null)).toBe('U');
  });

  it('2. mengembalikan label badge role yang sesuai', () => {
    expect(getRoleBadgeLabel('KARYAWAN')).toBe('KARYAWAN LAPANGAN');
    expect(getRoleBadgeLabel('SUPERVISOR')).toBe('SUPERVISOR');
    expect(getRoleBadgeLabel('HR_ADMIN')).toBe('HR ADMIN');
    expect(getRoleBadgeLabel(null)).toBe('PENGGUNA');
  });
});
