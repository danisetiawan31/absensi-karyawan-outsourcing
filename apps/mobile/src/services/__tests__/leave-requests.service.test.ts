import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  createLeaveRequestFormData,
  downloadAndOpenDocument,
  getLeaveRequests,
  getLeaveRequestsHistory,
  getPendingLeaveRequests,
  rejectLeaveRequest,
} from '../leave-requests.service';
import { useAuthStore } from '@/store/authStore';
import {
  LeaveRequestHistoryItem,
  LeaveRequestItem,
  LeaveRequestPendingItem,
} from '@/types/leave-request';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

describe('LeaveRequestsService (mobile/src/services/leave-requests.service.ts)', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(apiClient);
    useAuthStore.setState({ accessToken: 'mock-access-token' });
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

  describe('getPendingLeaveRequests', () => {
    it('harus memanggil GET /leave-requests?status=PENDING dan mengembalikan array LeaveRequestPendingItem', async () => {
      const mockPendingItems: LeaveRequestPendingItem[] = [
        {
          id: 'req-pending-1',
          tanggalMulai: '2026-08-10T00:00:00.000Z',
          tanggalSelesai: '2026-08-11T00:00:00.000Z',
          jenis: 'SAKIT',
          alasan: 'Demam',
          dokumenPendukungUrl: 'storage/dokumen-izin/doc.pdf',
          status: 'PENDING',
          catatanSupervisor: null,
          createdAt: '2026-08-09T10:00:00.000Z',
          karyawan: {
            id: 'user-emp-1',
            nama: 'Ahmad Karyawan',
          },
        },
      ];

      mockAxios.onGet('/leave-requests', { params: { status: 'PENDING' } }).reply(200, {
        success: true,
        data: mockPendingItems,
        meta: { timestamp: new Date().toISOString(), requestId: 'req-get-pending-1' },
      });

      const result = await getPendingLeaveRequests();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('req-pending-1');
      expect(result[0].karyawan.nama).toBe('Ahmad Karyawan');
    });
  });

  describe('approveLeaveRequest', () => {
    it('harus memanggil PATCH /leave-requests/:id/approve dengan catatanSupervisor', async () => {
      mockAxios.onPatch('/leave-requests/req-101/approve', { catatanSupervisor: 'Disetujui' }).reply(200, {
        success: true,
        data: { id: 'req-101', status: 'APPROVED' },
        meta: { timestamp: new Date().toISOString(), requestId: 'req-approve-1' },
      });

      const result = await approveLeaveRequest('req-101', 'Disetujui');

      expect(result.id).toBe('req-101');
      expect(result.status).toBe('APPROVED');
    });

    it('harus memanggil PATCH /leave-requests/:id/approve TANPA catatanSupervisor jika undefined', async () => {
      mockAxios.onPatch('/leave-requests/req-102/approve', {}).reply(200, {
        success: true,
        data: { id: 'req-102', status: 'APPROVED' },
        meta: { timestamp: new Date().toISOString(), requestId: 'req-approve-2' },
      });

      const result = await approveLeaveRequest('req-102');

      expect(result.id).toBe('req-102');
      expect(result.status).toBe('APPROVED');
    });
  });

  describe('rejectLeaveRequest', () => {
    it('harus memanggil PATCH /leave-requests/:id/reject dengan catatanSupervisor', async () => {
      mockAxios.onPatch('/leave-requests/req-201/reject', { catatanSupervisor: 'Jadwal padat' }).reply(200, {
        success: true,
        data: { id: 'req-201', status: 'REJECTED' },
        meta: { timestamp: new Date().toISOString(), requestId: 'req-reject-1' },
      });

      const result = await rejectLeaveRequest('req-201', 'Jadwal padat');

      expect(result.id).toBe('req-201');
      expect(result.status).toBe('REJECTED');
    });

    it('harus memanggil PATCH /leave-requests/:id/reject TANPA catatanSupervisor jika undefined', async () => {
      mockAxios.onPatch('/leave-requests/req-202/reject', {}).reply(200, {
        success: true,
        data: { id: 'req-202', status: 'REJECTED' },
        meta: { timestamp: new Date().toISOString(), requestId: 'req-reject-2' },
      });

      const result = await rejectLeaveRequest('req-202');

      expect(result.id).toBe('req-202');
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('getLeaveRequestsHistory', () => {
    const mockHistoryItems: LeaveRequestHistoryItem[] = [
      {
        id: 'hist-1',
        karyawanId: 'user-1',
        karyawan: { id: 'user-1', nama: 'Karyawan Satu' },
        tanggalMulai: '2026-08-01T00:00:00.000Z',
        tanggalSelesai: '2026-08-02T00:00:00.000Z',
        jenis: 'SAKIT',
        alasan: 'Demam',
        dokumenPendukungUrl: 'storage/doc1.pdf',
        status: 'APPROVED',
        catatanSupervisor: 'OK',
        approvedById: 'spv-1',
        approvedBy: { id: 'spv-1', nama: 'Supervisor Budi' },
        createdAt: '2026-08-01T08:00:00.000Z',
      },
    ];

    it('harus memanggil GET /leave-requests/history dengan semua query params jika diberikan', async () => {
      mockAxios.onGet('/leave-requests/history').reply((config) => {
        expect(config.params).toEqual({
          karyawanId: 'user-1',
          periodeMulai: '2026-08-01',
          periodeSelesai: '2026-08-31',
        });
        return [
          200,
          {
            success: true,
            data: mockHistoryItems,
            meta: { timestamp: new Date().toISOString(), requestId: 'req-hist-1' },
          },
        ];
      });

      const result = await getLeaveRequestsHistory({
        karyawanId: 'user-1',
        periodeMulai: '2026-08-01',
        periodeSelesai: '2026-08-31',
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('hist-1');
      expect(result[0].karyawan.nama).toBe('Karyawan Satu');
      expect(result[0].approvedBy?.nama).toBe('Supervisor Budi');
    });

    it('harus memanggil GET /leave-requests/history dengan query params parsial (hanya periode)', async () => {
      mockAxios.onGet('/leave-requests/history').reply((config) => {
        expect(config.params).toEqual({
          periodeMulai: '2026-08-01',
          periodeSelesai: '2026-08-10',
        });
        return [
          200,
          {
            success: true,
            data: mockHistoryItems,
            meta: { timestamp: new Date().toISOString(), requestId: 'req-hist-2' },
          },
        ];
      });

      const result = await getLeaveRequestsHistory({
        periodeMulai: '2026-08-01',
        periodeSelesai: '2026-08-10',
      });

      expect(result).toHaveLength(1);
    });

    it('harus memanggil GET /leave-requests/history TANPA query params jika undefined', async () => {
      mockAxios.onGet('/leave-requests/history').reply((config) => {
        expect(config.params).toBeUndefined();
        return [
          200,
          {
            success: true,
            data: mockHistoryItems,
            meta: { timestamp: new Date().toISOString(), requestId: 'req-hist-3' },
          },
        ];
      });

      const result = await getLeaveRequestsHistory();

      expect(result).toHaveLength(1);
    });
  });

  describe('downloadAndOpenDocument', () => {
    it('harus mengunduh file via FileSystem.downloadAsync dengan header Authorization dan membuka native share sheet via Sharing.shareAsync', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 200,
        uri: 'file:///cache/dokumen.pdf',
      });
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      await downloadAndOpenDocument('doc-id-100', 'dokumen.pdf');

      expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
        expect.stringContaining('/leave-requests/doc-id-100/dokumen'),
        'file:///cache/dokumen.pdf',
        {
          headers: { Authorization: 'Bearer mock-access-token' },
        },
      );
      expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/dokumen.pdf');
    });

    it('harus melempar error jika downloadAsync mengembalikan status non-200 (misal 404)', async () => {
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
        status: 404,
        uri: 'file:///cache/dokumen.pdf',
      });

      await expect(
        downloadAndOpenDocument('doc-id-404', 'dokumen.pdf'),
      ).rejects.toThrow('Gagal mengunduh dokumen. (HTTP 404)');

      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });
  });
});
