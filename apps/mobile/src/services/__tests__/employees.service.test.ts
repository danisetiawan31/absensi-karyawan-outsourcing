import MockAdapter from 'axios-mock-adapter';

import {
  AvailableEmployee,
  CreateEmployeePayload,
  CreateEmployeeResponse,
  Employee,
  UpdateEmployeePayload,
} from '@/types/employee';

import apiClient from '../apiClient';
import {
  createEmployee,
  getAvailableEmployees,
  getEmployees,
  resetFaceRegistration,
  updateEmployee,
} from '../employees.service';

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

  describe('getEmployees', () => {
    const mockEmployeeList: Employee[] = [
      {
        id: 'user-1',
        nama: 'Budi Santoso',
        email: 'budi@test.local',
        role: 'KARYAWAN',
        statusAktif: true,
        wajahTerdaftar: true,
      },
      {
        id: 'user-2',
        nama: 'Siti Rahma',
        email: 'spv@test.local',
        role: 'SUPERVISOR',
        statusAktif: true,
        wajahTerdaftar: false,
      },
    ];

    it('harus memanggil GET /employees tanpa query params saat params tidak diisi', async () => {
      mockAxios.onGet('/employees').reply(200, {
        success: true,
        data: mockEmployeeList,
      });

      const result = await getEmployees();

      expect(result).toEqual(mockEmployeeList);
      expect(mockAxios.history.get.length).toBe(1);
      expect(mockAxios.history.get[0].url).toBe('/employees');
      expect(mockAxios.history.get[0].params).toBeUndefined();
    });

    it('harus memanggil GET /employees dengan query params search, role, dan statusAktif', async () => {
      const queryParams = {
        search: 'Budi',
        role: 'KARYAWAN',
        statusAktif: true,
      };

      mockAxios
        .onGet('/employees', { params: queryParams })
        .reply(200, {
          success: true,
          data: [mockEmployeeList[0]],
        });

      const result = await getEmployees(queryParams);

      expect(result).toEqual([mockEmployeeList[0]]);
      expect(mockAxios.history.get[0].params).toEqual(queryParams);
    });
  });

  describe('createEmployee', () => {
    it('harus memanggil POST /employees dengan payload nama, email, role dan mengembalikan passwordSementara', async () => {
      const payload: CreateEmployeePayload = {
        nama: 'Karyawan Baru',
        email: 'baru@test.local',
        role: 'KARYAWAN',
      };

      const mockResponse: CreateEmployeeResponse = {
        id: 'user-new',
        nama: 'Karyawan Baru',
        email: 'baru@test.local',
        role: 'KARYAWAN',
        statusAktif: true,
        wajahTerdaftar: false,
        passwordSementara: 'Pass1234',
        createdAt: '2026-08-10T08:00:00.000Z',
      };

      mockAxios.onPost('/employees').reply(201, {
        success: true,
        data: mockResponse,
      });

      const result = await createEmployee(payload);

      expect(result).toEqual(mockResponse);
      expect(result.passwordSementara).toBe('Pass1234');
      expect(mockAxios.history.post.length).toBe(1);
      expect(mockAxios.history.post[0].url).toBe('/employees');
      expect(JSON.parse(mockAxios.history.post[0].data)).toEqual(payload);
    });
  });

  describe('updateEmployee', () => {
    it('harus memanggil PATCH /employees/:id dengan payload partial update', async () => {
      const payload: UpdateEmployeePayload = {
        role: 'SUPERVISOR',
        statusAktif: true,
      };

      const mockUpdated: Employee = {
        id: 'user-1',
        nama: 'Budi Santoso',
        email: 'budi@test.local',
        role: 'SUPERVISOR',
        statusAktif: true,
        wajahTerdaftar: true,
      };

      mockAxios.onPatch('/employees/user-1').reply(200, {
        success: true,
        data: mockUpdated,
      });

      const result = await updateEmployee('user-1', payload);

      expect(result).toEqual(mockUpdated);
      expect(mockAxios.history.patch.length).toBe(1);
      expect(mockAxios.history.patch[0].url).toBe('/employees/user-1');
      expect(JSON.parse(mockAxios.history.patch[0].data)).toEqual(payload);
    });
  });

  describe('resetFaceRegistration', () => {
    it('harus memanggil POST /employees/:id/reset-face-registration dan mengembalikan success: true', async () => {
      mockAxios
        .onPost('/employees/user-1/reset-face-registration')
        .reply(200, {
          success: true,
          data: { success: true },
        });

      const result = await resetFaceRegistration('user-1');

      expect(result).toEqual({ success: true });
      expect(mockAxios.history.post.length).toBe(1);
      expect(mockAxios.history.post[0].url).toBe(
        '/employees/user-1/reset-face-registration',
      );
    });
  });
});
