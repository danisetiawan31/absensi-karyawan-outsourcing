import MockAdapter from 'axios-mock-adapter';

import { AvailableEmployee } from '@/types/employee';

import apiClient from '../apiClient';
import { getAvailableEmployees } from '../employees.service';

describe('EmployeesService (mobile/src/services/employees.service.ts)', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('getAvailableEmployees', () => {
    it('harus memanggil GET /employees/available dengan query params tanggal & siteId', async () => {
      const mockEmployees: AvailableEmployee[] = [
        { id: 'user-1', nama: 'Ahmad Supardi' },
        { id: 'user-2', nama: 'Budi Santoso' },
      ];

      mockAxios
        .onGet('/employees/available', {
          params: { tanggal: '2026-08-10', siteId: 'site-1' },
        })
        .reply(200, {
          success: true,
          data: mockEmployees,
        });

      const result = await getAvailableEmployees('2026-08-10', 'site-1');

      expect(result).toEqual(mockEmployees);
      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe('/employees/available');
      expect(mockAxios.history.get[0].params).toEqual({
        tanggal: '2026-08-10',
        siteId: 'site-1',
      });
    });
  });
});
