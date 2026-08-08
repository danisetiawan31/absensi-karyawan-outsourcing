import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import {
  cancelLeaveRequest,
  createLeaveRequest,
  createLeaveRequestFormData,
  getLeaveRequests,
} from '../leave-requests.service';
import { LeaveRequestItem } from '@/types/leave-request';

describe('LeaveRequestsService (mobile/src/services/leave-requests.service.ts)', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('createLeaveRequestFormData', () => {
    it('harus membuat FormData TANPA dokumen jika parameter dokumen undefined', () => {
      const formData = createLeaveRequestFormData(
        '2026-08-10',
        '2026-08-10',
        'SAKIT',
        'Demam dan flu ringan',
      );

      expect(formData).toBeDefined();
    });

    it('harus membuat FormData DENGAN dokumen objek jika parameter dokumen diberikan', () => {
      const formData = createLeaveRequestFormData(
        '2026-08-10',
        '2026-08-12',
        'SAKIT',
        'Rawat inap',
        {
          uri: 'file:///storage/surat-dokter.pdf',
          name: 'surat-dokter.pdf',
          type: 'application/pdf',
          size: 1024,
        },
      );

      expect(formData).toBeDefined();
    });

    it('harus membuat FormData DENGAN dokumen string uri jika parameter dokumen berupa string', () => {
      const formData = createLeaveRequestFormData(
        '2026-08-10',
        '2026-08-12',
        'SAKIT',
        'Rawat inap',
        'file:///storage/surat-dokter.png',
      );

      expect(formData).toBeDefined();
    });
  });

  describe('getLeaveRequests', () => {
    it('harus memanggil GET /leave-requests dan mengembalikan array LeaveRequestItem dengan approvedBy', async () => {
      const mockItems: LeaveRequestItem[] = [
        {
          id: 'req-1',
          tanggalMulai: '2026-08-10T00:00:00.000Z',
          tanggalSelesai: '2026-08-11T00:00:00.000Z',
          jenis: 'SAKIT',
          alasan: 'Demam tinggi',
          dokumenPendukungUrl: 'storage/dokumen-izin/doc-1.pdf',
          status: 'APPROVED',
          catatanSupervisor: 'Istirahat yang cukup',
          createdAt: '2026-08-09T10:00:00.000Z',
          approvedBy: {
            nama: 'Budi Supervisor',
          },
        },
        {
          id: 'req-2',
          tanggalMulai: '2026-08-15T00:00:00.000Z',
          tanggalSelesai: '2026-08-15T00:00:00.000Z',
          jenis: 'IZIN',
          alasan: 'Urusan keluarga',
          dokumenPendukungUrl: null,
          status: 'PENDING',
          catatanSupervisor: null,
          createdAt: '2026-08-14T08:00:00.000Z',
          approvedBy: null,
        },
      ];

      mockAxios.onGet('/leave-requests').reply(200, {
        success: true,
        data: mockItems,
        meta: { timestamp: new Date().toISOString(), requestId: 'req-get-1' },
      });

      const result = await getLeaveRequests();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('req-1');
      expect(result[0].approvedBy?.nama).toBe('Budi Supervisor');
      expect(result[1].id).toBe('req-2');
      expect(result[1].approvedBy).toBeNull();
    });
  });

  describe('createLeaveRequest', () => {
    it('harus mengirim POST /leave-requests multipart/form-data DENGAN dokumen dan timeout 60s', async () => {
      mockAxios.onPost('/leave-requests').reply((config) => {
        expect(config.timeout).toBe(60000);
        expect(config.headers?.['Content-Type']).toBe('multipart/form-data');
        expect(config.data).toBeInstanceOf(FormData);

        return [
          201,
          {
            success: true,
            data: { id: 'new-req-1', status: 'PENDING' },
            meta: { timestamp: new Date().toISOString(), requestId: 'req-post-1' },
          },
        ];
      });

      const result = await createLeaveRequest(
        '2026-08-10',
        '2026-08-12',
        'SAKIT',
        'Demam dan rawat jalan',
        {
          uri: 'file:///docs/surat.pdf',
          name: 'surat.pdf',
          type: 'application/pdf',
        },
      );

      expect(result.id).toBe('new-req-1');
      expect(result.status).toBe('PENDING');
    });

    it('harus mengirim POST /leave-requests multipart/form-data TANPA dokumen', async () => {
      mockAxios.onPost('/leave-requests').reply((config) => {
        expect(config.timeout).toBe(60000);
        expect(config.headers?.['Content-Type']).toBe('multipart/form-data');
        expect(config.data).toBeInstanceOf(FormData);

        return [
          201,
          {
            success: true,
            data: { id: 'new-req-2', status: 'PENDING' },
            meta: { timestamp: new Date().toISOString(), requestId: 'req-post-2' },
          },
        ];
      });

      const result = await createLeaveRequest(
        '2026-08-10',
        '2026-08-10',
        'IZIN',
        'Urusan pribadi',
      );

      expect(result.id).toBe('new-req-2');
      expect(result.status).toBe('PENDING');
    });
  });

  describe('cancelLeaveRequest', () => {
    it('harus mengirim PATCH /leave-requests/:id/cancel dan mengembalikan id serta status CANCELLED', async () => {
      mockAxios.onPatch('/leave-requests/req-999/cancel').reply(200, {
        success: true,
        data: { id: 'req-999', status: 'CANCELLED' },
        meta: { timestamp: new Date().toISOString(), requestId: 'req-patch-1' },
      });

      const result = await cancelLeaveRequest('req-999');

      expect(result.id).toBe('req-999');
      expect(result.status).toBe('CANCELLED');
    });
  });
});
