import { COLORS } from '@/constants/theme';
import { Site } from '@/types/site';
import { SupervisorSiteItem } from '@/types/supervisor-site';

import {
  filterSites,
  getSiteStatusBadgeConfig,
  getSupervisorCountBadgeConfig,
  getSupervisorCountForSite,
  navigateToCreateSite,
  navigateToEditSite,
} from '../HrAdminSitesScreen';

const mockSites: Site[] = [
  {
    id: 'site-1',
    nama: 'Wisma Atlet',
    alamat: 'Jl. Sunter Permai No. 1, Jakarta Utara',
    latitude: -6.15,
    longitude: 106.88,
    radiusToleransi: 75,
    statusAktif: true,
  },
  {
    id: 'site-2',
    nama: 'Gedung Sudirman',
    alamat: 'Jl. Jend. Sudirman No. 45, Jakarta Selatan',
    latitude: -6.21,
    longitude: 106.82,
    radiusToleransi: 100,
    statusAktif: false,
  },
];

const mockSupervisorSites: SupervisorSiteItem[] = [
  {
    id: 'ss-1',
    site: { id: 'site-1', nama: 'Wisma Atlet', alamat: 'Jl. Sunter' },
  },
  {
    id: 'ss-2',
    site: { id: 'site-1', nama: 'Wisma Atlet', alamat: 'Jl. Sunter' },
  },
  {
    id: 'ss-3',
    site: { id: 'site-3', nama: 'Site Lain', alamat: 'Jl. Lain' },
  },
];

describe('HrAdminSitesScreen Logic & Helpers', () => {
  describe('1. getSupervisorCountForSite (Kalkulasi Client-Side Supervisor Per Site)', () => {
    it('menghitung jumlah supervisor per site dengan tepat dan tidak tertukar antar-site', () => {
      const countSite1 = getSupervisorCountForSite('site-1', mockSupervisorSites);
      const countSite2 = getSupervisorCountForSite('site-2', mockSupervisorSites);
      const countSite3 = getSupervisorCountForSite('site-3', mockSupervisorSites);

      expect(countSite1).toBe(2);
      expect(countSite2).toBe(0);
      expect(countSite3).toBe(1);
    });

    it('menangani ID tidak ditemukan atau array kosong secara aman', () => {
      expect(getSupervisorCountForSite('non-existent', mockSupervisorSites)).toBe(0);
      expect(getSupervisorCountForSite('site-1', [])).toBe(0);
    });
  });

  describe('2. getSiteStatusBadgeConfig (Konfigurasi Badge Status Aktif)', () => {
    it('mengembalikan status Aktif dengan warna text-emerald-700 jika statusAktif=true', () => {
      const config = getSiteStatusBadgeConfig(true);
      expect(config.text).toBe('Aktif');
      expect(config.isSuccess).toBe(true);
      expect(config.textClassName).toBe('text-emerald-700');
    });

    it('mengembalikan status Nonaktif dengan warna text-slate-600 jika statusAktif=false', () => {
      const config = getSiteStatusBadgeConfig(false);
      expect(config.text).toBe('Nonaktif');
      expect(config.isSuccess).toBe(false);
      expect(config.textClassName).toBe('text-slate-600');
    });
  });

  describe('3. getSupervisorCountBadgeConfig (Konfigurasi Badge Jumlah Supervisor & Semantik Warning)', () => {
    it('supervisorCount = 0 (site tanpa supervisor) HARUS mendapatkan token warning & highlight perhatian', () => {
      const config = getSupervisorCountBadgeConfig(0);
      expect(config.text).toBe('Belum ada supervisor');
      expect(config.isWarning).toBe(true);
      expect(config.bgClassName).toContain('bg-[#FFEDD5]');
      expect(config.textClassName).toContain('text-[#9A3412]');
      expect(config.iconColor).toBe(COLORS.warning);
    });

    it('supervisorCount > 0 (site normal dengan supervisor) mendapatkan styling netral/muted', () => {
      const config = getSupervisorCountBadgeConfig(2);
      expect(config.text).toBe('2 Supervisor');
      expect(config.isWarning).toBe(false);
      expect(config.bgClassName).toBe('bg-slate-100 border border-transparent');
      expect(config.textClassName).toContain('text-slate-600');
      expect(config.iconColor).toBe(COLORS.muted);
    });
  });

  describe('4. filterSites (Filter Pencarian Site)', () => {
    it('mengembalikan semua site jika query pencarian kosong', () => {
      const result = filterSites(mockSites, '');
      expect(result).toHaveLength(2);
    });

    it('memfilter berdasarkan nama site secara case-insensitive', () => {
      const result = filterSites(mockSites, 'wisma');
      expect(result).toHaveLength(1);
      expect(result[0].nama).toBe('Wisma Atlet');
    });

    it('memfilter berdasarkan alamat site', () => {
      const result = filterSites(mockSites, 'Sudirman');
      expect(result).toHaveLength(1);
      expect(result[0].nama).toBe('Gedung Sudirman');
    });
  });

  describe('5. Aksi Navigasi', () => {
    it('navigateToCreateSite memanggil routerPush dengan route create site', () => {
      const mockPush = jest.fn();
      navigateToCreateSite(mockPush);
      expect(mockPush).toHaveBeenCalledWith('/(hr-admin)/site-create');
    });

    it('navigateToEditSite memanggil routerPush dengan route edit site dan param id', () => {
      const mockPush = jest.fn();
      navigateToEditSite(mockPush, 'site-999');
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(hr-admin)/site-edit',
        params: { id: 'site-999' },
      });
    });
  });
});
