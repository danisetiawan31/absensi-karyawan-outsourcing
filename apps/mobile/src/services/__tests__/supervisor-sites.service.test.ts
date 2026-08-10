import MockAdapter from 'axios-mock-adapter';

import { SupervisorSiteItem } from '@/types/supervisor-site';

import apiClient from '../apiClient';
import {
  createSupervisorSite,
  deleteSupervisorSite,
  getSupervisorSites,
} from '../supervisor-sites.service';

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

    it('harus mengirimkan query supervisorId jika diberikan', async () => {
      mockAxios.onGet('/supervisor-sites').reply(200, {
        success: true,
        data: [],
      });

      await getSupervisorSites('spv-123');

      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].params).toEqual({ supervisorId: 'spv-123' });
    });
  });

  describe('createSupervisorSite', () => {
    it('harus memanggil POST /supervisor-sites dengan payload supervisorId & siteId', async () => {
      mockAxios.onPost('/supervisor-sites').reply(201, {
        success: true,
        data: { id: 'ss-uuid-new' },
      });

      const payload = { supervisorId: 'spv-123', siteId: 'site-456' };
      const result = await createSupervisorSite(payload);

      expect(result).toEqual({ id: 'ss-uuid-new' });
      expect(mockAxios.history.post.length).toBe(1);
      expect(mockAxios.history.post[0].url).toBe('/supervisor-sites');
      expect(JSON.parse(mockAxios.history.post[0].data)).toEqual(payload);
    });
  });

  describe('deleteSupervisorSite', () => {
    it('harus memanggil DELETE /supervisor-sites/:id dan mengembalikan response sukses', async () => {
      mockAxios.onDelete('/supervisor-sites/ss-uuid-1').reply(200, {
        success: true,
        data: { success: true },
      });

      const result = await deleteSupervisorSite('ss-uuid-1');

      expect(result).toEqual({ success: true });
      expect(mockAxios.history.delete.length).toBe(1);
      expect(mockAxios.history.delete[0].url).toBe('/supervisor-sites/ss-uuid-1');
    });
  });
});
