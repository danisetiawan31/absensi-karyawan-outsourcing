import axios from 'axios';
import { COLORS } from '@/constants/theme';
import { Employee } from '@/types/employee';
import { SupervisorSiteItem } from '@/types/supervisor-site';

import {
  DEFAULT_JAKARTA_COORDS,
  getAssignmentsForSite,
  getAvailableSupervisors,
  getInitialMapCoordinates,
  hexToRgba,
  processAssignSupervisor,
  processSiteFormSubmit,
  processUnassignSupervisor,
  validateSiteForm,
} from '../HrAdminSiteFormScreen';

const mockSupervisorSites: SupervisorSiteItem[] = [
  {
    id: 'ss-1',
    site: { id: 'site-1', nama: 'Wisma Atlet', alamat: 'Jl. Sunter' },
    supervisor: { id: 'sup-1', nama: 'Supervisor Satu', email: 'sup1@test.com' },
  },
  {
    id: 'ss-2',
    site: { id: 'site-1', nama: 'Wisma Atlet', alamat: 'Jl. Sunter' },
    supervisor: { id: 'sup-2', nama: 'Supervisor Dua', email: 'sup2@test.com' },
  },
  {
    id: 'ss-3',
    site: { id: 'site-2', nama: 'Gedung Sudirman', alamat: 'Jl. Sudirman' },
    supervisor: { id: 'sup-3', nama: 'Supervisor Tiga', email: 'sup3@test.com' },
  },
];

const mockSupervisorsList: Employee[] = [
  {
    id: 'sup-1',
    nama: 'Supervisor Satu',
    email: 'sup1@test.com',
    role: 'SUPERVISOR',
    statusAktif: true,
    wajahTerdaftar: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'sup-2',
    nama: 'Supervisor Dua',
    email: 'sup2@test.com',
    role: 'SUPERVISOR',
    statusAktif: true,
    wajahTerdaftar: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'sup-4',
    nama: 'Supervisor Empat',
    email: 'sup4@test.com',
    role: 'SUPERVISOR',
    statusAktif: true,
    wajahTerdaftar: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('HrAdminSiteFormScreen Logic & Presenter Tests', () => {
  describe('0. hexToRgba (Konversi Token Warna ke RGBA)', () => {
    it('mengonversi COLORS.primary (#FFC81E) ke rgba(255, 200, 30, 0.25) secara presisi', () => {
      const rgba = hexToRgba(COLORS.primary, 0.25);
      expect(rgba).toBe('rgba(255, 200, 30, 0.25)');
    });
  });

  describe('1. validateSiteForm (Validasi Client-Side Form)', () => {
    it('form valid mengembalikan isValid=true dan parsed numbers', () => {
      const result = validateSiteForm(
        'Wisma Atlet',
        'Jl. Sunter',
        '-6.150000',
        '106.880000',
        '75',
      );

      expect(result.isValid).toBe(true);
      expect(result.parsedLatitude).toBe(-6.15);
      expect(result.parsedLongitude).toBe(106.88);
      expect(result.parsedRadius).toBe(75);
    });

    it('nama site kosong -> ditolak dengan pesan error', () => {
      const result = validateSiteForm('', 'Jl. Sunter', '-6.15', '106.88', '75');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Nama site tidak boleh kosong.');
    });

    it('alamat site kosong -> ditolak dengan pesan error', () => {
      const result = validateSiteForm('Wisma Atlet', '  ', '-6.15', '106.88', '75');
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Alamat site tidak boleh kosong.');
    });

    it('latitude di luar rentang (-90 s/d 90) -> ditolak dengan pesan error spesifik', () => {
      const resLow = validateSiteForm('Site A', 'Alamat', '-95.0', '106.88', '75');
      expect(resLow.isValid).toBe(false);
      expect(resLow.errorMessage).toBe('Latitude harus berupa angka antara -90 dan 90.');

      const resHigh = validateSiteForm('Site A', 'Alamat', '95.0', '106.88', '75');
      expect(resHigh.isValid).toBe(false);
      expect(resHigh.errorMessage).toBe('Latitude harus berupa angka antara -90 dan 90.');

      const resNaN = validateSiteForm('Site A', 'Alamat', 'abc', '106.88', '75');
      expect(resNaN.isValid).toBe(false);
      expect(resNaN.errorMessage).toBe('Latitude harus berupa angka antara -90 dan 90.');
    });

    it('longitude di luar rentang (-180 s/d 180) -> ditolak dengan pesan error spesifik', () => {
      const resLow = validateSiteForm('Site A', 'Alamat', '-6.15', '-185.0', '75');
      expect(resLow.isValid).toBe(false);
      expect(resLow.errorMessage).toBe('Longitude harus berupa angka antara -180 dan 180.');

      const resHigh = validateSiteForm('Site A', 'Alamat', '-6.15', '185.0', '75');
      expect(resHigh.isValid).toBe(false);
      expect(resHigh.errorMessage).toBe('Longitude harus berupa angka antara -180 dan 180.');
    });

    it('radiusToleransi <= 0 atau non-numeric -> ditolak dengan pesan error spesifik', () => {
      const resZero = validateSiteForm('Site A', 'Alamat', '-6.15', '106.88', '0');
      expect(resZero.isValid).toBe(false);
      expect(resZero.errorMessage).toBe(
        'Radius toleransi harus berupa angka positif lebih besar dari 0.',
      );

      const resNeg = validateSiteForm('Site A', 'Alamat', '-6.15', '106.88', '-10');
      expect(resNeg.isValid).toBe(false);
      expect(resNeg.errorMessage).toBe(
        'Radius toleransi harus berupa angka positif lebih besar dari 0.',
      );
    });
  });

  describe('2. getInitialMapCoordinates (Inisialisasi Lokasi & Fallback)', () => {
    it('mode Edit -> langsung mengembalikan koordinat existing site', async () => {
      const existing = { latitude: -7.25, longitude: 112.75 };
      const coords = await getInitialMapCoordinates(true, existing);
      expect(coords).toEqual(existing);
    });

    it('mode Create + izin granted -> mengembalikan koordinat dari location module', async () => {
      const mockLocation = {
        requestForegroundPermissionsAsync: jest
          .fn()
          .mockResolvedValue({ status: 'granted' }),
        getCurrentPositionAsync: jest.fn().mockResolvedValue({
          coords: { latitude: -6.175, longitude: 106.827 },
        }),
      };

      const coords = await getInitialMapCoordinates(false, null, mockLocation as any);
      expect(coords).toEqual({ latitude: -6.175, longitude: 106.827 });
    });

    it('mode Create + izin denied/error -> fallback ke koordinat Jakarta tanpa crash', async () => {
      const mockLocation = {
        requestForegroundPermissionsAsync: jest
          .fn()
          .mockResolvedValue({ status: 'denied' }),
        getCurrentPositionAsync: jest.fn(),
      };

      const coords = await getInitialMapCoordinates(false, null, mockLocation as any);
      expect(coords).toEqual(DEFAULT_JAKARTA_COORDS);
    });
  });

  describe('3. processSiteFormSubmit (Submit Presenter Logic & Double-Tap Guard)', () => {
    let isSubmittingRef: { current: boolean };
    let setIsSubmitting: jest.Mock;
    let setServerError: jest.Mock;
    let createSiteFn: jest.Mock;
    let updateSiteFn: jest.Mock;
    let invalidateQueriesFn: jest.Mock;
    let onSuccessNav: jest.Mock;

    beforeEach(() => {
      isSubmittingRef = { current: false };
      setIsSubmitting = jest.fn();
      setServerError = jest.fn();
      createSiteFn = jest.fn();
      updateSiteFn = jest.fn();
      invalidateQueriesFn = jest.fn();
      onSuccessNav = jest.fn();
    });

    it('mode Create sukses -> memanggil createSiteFn, invalidateQueries, dan navigasi balik', async () => {
      createSiteFn.mockResolvedValue({});

      const result = await processSiteFormSubmit({
        nama: 'Wisma Atlet',
        alamat: 'Jl. Sunter',
        latitudeStr: '-6.15',
        longitudeStr: '106.88',
        radiusToleransiStr: '75',
        statusAktif: true,
        isSubmittingRef,
        setIsSubmitting,
        setServerError,
        createSiteFn,
        updateSiteFn,
        invalidateQueriesFn,
        onSuccessNav,
      });

      expect(result.success).toBe(true);
      expect(createSiteFn).toHaveBeenCalledWith({
        nama: 'Wisma Atlet',
        alamat: 'Jl. Sunter',
        latitude: -6.15,
        longitude: 106.88,
        radiusToleransi: 75,
      });
      expect(invalidateQueriesFn).toHaveBeenCalledTimes(1);
      expect(onSuccessNav).toHaveBeenCalledTimes(1);
    });

    it('mode Edit sukses -> memanggil updateSiteFn dengan id dan payload termasuk statusAktif', async () => {
      updateSiteFn.mockResolvedValue({});

      const result = await processSiteFormSubmit({
        id: 'site-123',
        nama: 'Wisma Atlet Edit',
        alamat: 'Jl. Sunter Edit',
        latitudeStr: '-6.15',
        longitudeStr: '106.88',
        radiusToleransiStr: '100',
        statusAktif: false,
        isSubmittingRef,
        setIsSubmitting,
        setServerError,
        createSiteFn,
        updateSiteFn,
        invalidateQueriesFn,
        onSuccessNav,
      });

      expect(result.success).toBe(true);
      expect(updateSiteFn).toHaveBeenCalledWith('site-123', {
        nama: 'Wisma Atlet Edit',
        alamat: 'Jl. Sunter Edit',
        latitude: -6.15,
        longitude: 106.88,
        radiusToleransi: 100,
        statusAktif: false,
      });
    });

    it('double-tap guard -> tap kedua diblokir', async () => {
      createSiteFn.mockResolvedValue({});

      const p1 = processSiteFormSubmit({
        nama: 'Site A',
        alamat: 'Alamat',
        latitudeStr: '-6.15',
        longitudeStr: '106.88',
        radiusToleransiStr: '75',
        statusAktif: true,
        isSubmittingRef,
        setIsSubmitting,
        setServerError,
        createSiteFn,
        updateSiteFn,
        invalidateQueriesFn,
        onSuccessNav,
      });

      const p2 = processSiteFormSubmit({
        nama: 'Site A',
        alamat: 'Alamat',
        latitudeStr: '-6.15',
        longitudeStr: '106.88',
        radiusToleransiStr: '75',
        statusAktif: true,
        isSubmittingRef,
        setIsSubmitting,
        setServerError,
        createSiteFn,
        updateSiteFn,
        invalidateQueriesFn,
        onSuccessNav,
      });

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(false);
      expect(createSiteFn).toHaveBeenCalledTimes(1);
    });

    it('server error -> menampilkan AlertBanner dan TIDAK memanggil onSuccessNav', async () => {
      const mockAxiosErr = {
        isAxiosError: true,
        response: {
          data: {
            error: { message: 'Nama site sudah terdaftar.' },
          },
        },
      };

      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      createSiteFn.mockRejectedValue(mockAxiosErr);

      const result = await processSiteFormSubmit({
        nama: 'Duplikat',
        alamat: 'Alamat',
        latitudeStr: '-6.15',
        longitudeStr: '106.88',
        radiusToleransiStr: '75',
        statusAktif: true,
        isSubmittingRef,
        setIsSubmitting,
        setServerError,
        createSiteFn,
        updateSiteFn,
        invalidateQueriesFn,
        onSuccessNav,
      });

      expect(result.success).toBe(false);
      expect(setServerError).toHaveBeenCalledWith('Nama site sudah terdaftar.');
      expect(onSuccessNav).not.toHaveBeenCalled();
    });
  });

  describe('4. Tahap 4 Helpers (Assign / Unassign Supervisor Section)', () => {
    it('getAssignmentsForSite memfilter supervisor-sites per site id secara presisi', () => {
      const site1Assignments = getAssignmentsForSite('site-1', mockSupervisorSites);
      const site2Assignments = getAssignmentsForSite('site-2', mockSupervisorSites);
      const site3Assignments = getAssignmentsForSite('site-3', mockSupervisorSites);

      expect(site1Assignments).toHaveLength(2);
      expect(site1Assignments.map((a) => a.id)).toEqual(['ss-1', 'ss-2']);

      expect(site2Assignments).toHaveLength(1);
      expect(site2Assignments[0].id).toBe('ss-3');

      expect(site3Assignments).toHaveLength(0);
    });

    it('getAvailableSupervisors mengeliminasi supervisor yang sudah ter-assign dan menerapkan filter pencarian', () => {
      const site1Assignments = getAssignmentsForSite('site-1', mockSupervisorSites);

      // Total supervisor: sup-1, sup-2, sup-4. sup-1 & sup-2 sudah di-assign ke site-1.
      const available = getAvailableSupervisors(mockSupervisorsList, site1Assignments);
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe('sup-4');

      // Search filter
      const searchMatch = getAvailableSupervisors(
        mockSupervisorsList,
        site1Assignments,
        'Empat',
      );
      expect(searchMatch).toHaveLength(1);

      const searchNoMatch = getAvailableSupervisors(
        mockSupervisorsList,
        site1Assignments,
        'TidakAda',
      );
      expect(searchNoMatch).toHaveLength(0);
    });
  });

  describe('5. processAssignSupervisor & processUnassignSupervisor Presenters', () => {
    let isAssigningRef: { current: boolean };
    let isUnassigningRef: { current: boolean };
    let setIsAssigning: jest.Mock;
    let setIsUnassigning: jest.Mock;
    let setAssignError: jest.Mock;
    let setUnassignError: jest.Mock;
    let createSupervisorSiteFn: jest.Mock;
    let deleteSupervisorSiteFn: jest.Mock;
    let invalidateQueriesFn: jest.Mock;
    let refetchSupervisorsFn: jest.Mock;
    let onSuccess: jest.Mock;

    beforeEach(() => {
      isAssigningRef = { current: false };
      isUnassigningRef = { current: false };
      setIsAssigning = jest.fn();
      setIsUnassigning = jest.fn();
      setAssignError = jest.fn();
      setUnassignError = jest.fn();
      createSupervisorSiteFn = jest.fn();
      deleteSupervisorSiteFn = jest.fn();
      invalidateQueriesFn = jest.fn();
      refetchSupervisorsFn = jest.fn();
      onSuccess = jest.fn();
    });

    it('processAssignSupervisor sukses -> memanggil API, invalidate queries, dan onSuccess', async () => {
      createSupervisorSiteFn.mockResolvedValue({});

      const result = await processAssignSupervisor({
        siteId: 'site-1',
        supervisorId: 'sup-4',
        isAssigningRef,
        setIsAssigning,
        setAssignError,
        createSupervisorSiteFn,
        invalidateQueriesFn,
        refetchSupervisorsFn,
        onSuccess,
      });

      expect(result.success).toBe(true);
      expect(createSupervisorSiteFn).toHaveBeenCalledWith({
        siteId: 'site-1',
        supervisorId: 'sup-4',
      });
      expect(invalidateQueriesFn).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('processAssignSupervisor double-tap guard -> tap kedua diblokir', async () => {
      createSupervisorSiteFn.mockResolvedValue({});

      const p1 = processAssignSupervisor({
        siteId: 'site-1',
        supervisorId: 'sup-4',
        isAssigningRef,
        setIsAssigning,
        setAssignError,
        createSupervisorSiteFn,
        invalidateQueriesFn,
        refetchSupervisorsFn,
        onSuccess,
      });

      const p2 = processAssignSupervisor({
        siteId: 'site-1',
        supervisorId: 'sup-4',
        isAssigningRef,
        setIsAssigning,
        setAssignError,
        createSupervisorSiteFn,
        invalidateQueriesFn,
        refetchSupervisorsFn,
        onSuccess,
      });

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(false);
      expect(createSupervisorSiteFn).toHaveBeenCalledTimes(1);
    });

    it('processAssignSupervisor error ROLE_BUKAN_SUPERVISOR (400) -> pesan error spesifik & memanggil refetchSupervisorsFn', async () => {
      const mockAxiosErr = {
        isAxiosError: true,
        response: {
          data: {
            error: {
              code: 'ROLE_BUKAN_SUPERVISOR',
              message: 'User bukan supervisor',
            },
          },
        },
      };

      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      createSupervisorSiteFn.mockRejectedValue(mockAxiosErr);

      const result = await processAssignSupervisor({
        siteId: 'site-1',
        supervisorId: 'sup-4',
        isAssigningRef,
        setIsAssigning,
        setAssignError,
        createSupervisorSiteFn,
        invalidateQueriesFn,
        refetchSupervisorsFn,
        onSuccess,
      });

      expect(result.success).toBe(false);
      expect(setAssignError).toHaveBeenCalledWith(
        'Pengguna tersebut tidak lagi memiliki role Supervisor.',
      );
      expect(refetchSupervisorsFn).toHaveBeenCalledTimes(1);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('processUnassignSupervisor sukses -> memanggil delete API, invalidate queries, dan onSuccess', async () => {
      deleteSupervisorSiteFn.mockResolvedValue({});

      const result = await processUnassignSupervisor({
        assignmentId: 'ss-1',
        isUnassigningRef,
        setIsUnassigning,
        setUnassignError,
        deleteSupervisorSiteFn,
        invalidateQueriesFn,
        onSuccess,
      });

      expect(result.success).toBe(true);
      expect(deleteSupervisorSiteFn).toHaveBeenCalledWith('ss-1');
      expect(invalidateQueriesFn).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('processUnassignSupervisor double-tap guard -> tap kedua diblokir', async () => {
      deleteSupervisorSiteFn.mockResolvedValue({});

      const p1 = processUnassignSupervisor({
        assignmentId: 'ss-1',
        isUnassigningRef,
        setIsUnassigning,
        setUnassignError,
        deleteSupervisorSiteFn,
        invalidateQueriesFn,
        onSuccess,
      });

      const p2 = processUnassignSupervisor({
        assignmentId: 'ss-1',
        isUnassigningRef,
        setIsUnassigning,
        setUnassignError,
        deleteSupervisorSiteFn,
        invalidateQueriesFn,
        onSuccess,
      });

      const [res1, res2] = await Promise.all([p1, p2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(false);
      expect(deleteSupervisorSiteFn).toHaveBeenCalledTimes(1);
    });
  });
});
