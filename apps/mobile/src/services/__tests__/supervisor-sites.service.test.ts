import MockAdapter from 'axios-mock-adapter';

import { SupervisorSiteItem } from '@/types/supervisor-site';

import apiClient from '../apiClient';
import { getSupervisorSites } from '../supervisor-sites.service';

describe('SupervisorSitesService (mobile/src/services/supervisor-sites.service.ts)', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('getSupervisorSites', () => {
    it('harus memanggil GET /supervisor-sites tanpa query params dan mengembalikan list site supervisor', async () => {
      const mockSites: SupervisorSiteItem[] = [
        {
          id: 'ss-uuid-1',
          site: {
            id: 'site-1',
            nama: 'Wisma Atlet',
            alamat: 'Jl. Sunter Jakarta',
          },
        },
      ];

      mockAxios.onGet('/supervisor-sites').reply(200, {
        success: true,
        data: mockSites,
      });

      const result = await getSupervisorSites();

      expect(result).toEqual(mockSites);
      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe('/supervisor-sites');
    });
  });
});
