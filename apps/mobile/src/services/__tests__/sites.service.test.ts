import MockAdapter from 'axios-mock-adapter';

import { Site } from '@/types/site';

import apiClient from '../apiClient';
import { createSite, getSites, updateSite } from '../sites.service';

describe('SitesService (mobile/src/services/sites.service.ts)', () => {
  let mockAxios: MockAdapter;

  const mockSite: Site = {
    id: 'site-uuid-1',
    nama: 'Kantor Pusat Jakarta',
    alamat: 'Jl. Jend. Sudirman No. 1',
    latitude: -6.2088,
    longitude: 106.8456,
    radiusToleransi: 100,
    statusAktif: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('getSites', () => {
    it('harus memanggil GET /sites tanpa query params jika statusAktif tidak diberikan', async () => {
      mockAxios.onGet('/sites').reply(200, {
        success: true,
        data: [mockSite],
      });

      const result = await getSites();

      expect(result).toEqual([mockSite]);
      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe('/sites');
      expect(mockAxios.history.get[0].params).toBeUndefined();
    });

    it('harus mengirimkan query statusAktif=true jika diberikan', async () => {
      mockAxios.onGet('/sites').reply(200, {
        success: true,
        data: [mockSite],
      });

      const result = await getSites(true);

      expect(result).toEqual([mockSite]);
      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].params).toEqual({ statusAktif: true });
    });
  });

  describe('createSite', () => {
    it('harus memanggil POST /sites dengan payload yang sesuai', async () => {
      mockAxios.onPost('/sites').reply(201, {
        success: true,
        data: mockSite,
      });

      const payload = {
        nama: 'Kantor Pusat Jakarta',
        alamat: 'Jl. Jend. Sudirman No. 1',
        latitude: -6.2088,
        longitude: 106.8456,
        radiusToleransi: 100,
      };

      const result = await createSite(payload);

      expect(result).toEqual(mockSite);
      expect(mockAxios.history.post.length).toBe(1);
      expect(mockAxios.history.post[0].url).toBe('/sites');
      expect(JSON.parse(mockAxios.history.post[0].data)).toEqual(payload);
    });
  });

  describe('updateSite', () => {
    it('harus memanggil PATCH /sites/:id dengan partial payload', async () => {
      const updatedSite = { ...mockSite, nama: 'Kantor Pusat Sudirman' };

      mockAxios.onPatch('/sites/site-uuid-1').reply(200, {
        success: true,
        data: updatedSite,
      });

      const payload = { nama: 'Kantor Pusat Sudirman' };
      const result = await updateSite('site-uuid-1', payload);

      expect(result).toEqual(updatedSite);
      expect(mockAxios.history.patch.length).toBe(1);
      expect(mockAxios.history.patch[0].url).toBe('/sites/site-uuid-1');
      expect(JSON.parse(mockAxios.history.patch[0].data)).toEqual(payload);
    });
  });
});
