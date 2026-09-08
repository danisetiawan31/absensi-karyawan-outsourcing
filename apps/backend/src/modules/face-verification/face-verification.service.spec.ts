import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import {
  EmbedFaceResponse,
  FaceVerificationService,
} from './face-verification.service';

describe('FaceVerificationService (Unit Test)', () => {
  let service: FaceVerificationService;
  let httpService: jest.Mocked<HttpService>;

  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SKIP_FACE_VERIFICATION;
    delete process.env.FACE_SERVICE_TIMEOUT_MS;
    delete process.env.FACE_SERVICE_URL;

    httpService = {
      post: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    service = new FaceVerificationService(httpService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Inisialisasi & Konfigurasi Timeout', () => {
    it('harus menggunakan default timeout 40000 ms jika FACE_SERVICE_TIMEOUT_MS tidak disetel', () => {
      // Inisialisasi tanpa env var
      const defaultService = new FaceVerificationService(httpService);
      // Akses private field timeoutMs via type casting terkontrol tanpa any
      const timeout = (defaultService as unknown as { timeoutMs: number })
        .timeoutMs;
      expect(timeout).toBe(40000);
    });

    it('harus membaca custom timeout jika FACE_SERVICE_TIMEOUT_MS disetel', () => {
      process.env.FACE_SERVICE_TIMEOUT_MS = '25000';
      const customService = new FaceVerificationService(httpService);
      const timeout = (customService as unknown as { timeoutMs: number })
        .timeoutMs;
      expect(timeout).toBe(25000);
    });
  });

  describe('embedFace()', () => {
    it('harus mengembalikan dummy embedding jika SKIP_FACE_VERIFICATION=true', async () => {
      process.env.SKIP_FACE_VERIFICATION = 'true';

      const result = await service.embedFace('dummy_base64_string');

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3],
        liveness: {
          isLive: true,
          confidence: 1.0,
        },
      });
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('harus memanggil python service dengan timeout 40000 ms dan mengembalikan data sukses', async () => {
      const mockSuccessData: EmbedFaceResponse = {
        embedding: [0.12, 0.34, 0.56],
        liveness: {
          isLive: true,
          confidence: 0.98,
        },
      };

      const mockResponse: AxiosResponse<EmbedFaceResponse> = {
        data: mockSuccessData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.post.mockReturnValueOnce(of(mockResponse));

      const result = await service.embedFace('valid_base64_image');

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/internal/embed',
        { foto: 'valid_base64_image' },
        { timeout: 40000 },
      );
      expect(result).toEqual(mockSuccessData);
    });

    it('harus melempar HttpException 422 saat Python mengembalikan WAJAH_TIDAK_TERDETEKSI', async () => {
      const axiosError = new AxiosError('Unprocessable Entity');
      axiosError.response = {
        status: 422,
        statusText: 'Unprocessable Entity',
        data: {
          error: {
            code: 'WAJAH_TIDAK_TERDETEKSI',
            message: 'Wajah tidak terdeteksi dalam foto',
          },
        },
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.post.mockReturnValueOnce(throwError(() => axiosError));

      try {
        await service.embedFace('no_face_image');
        fail('Should have thrown HttpException');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(HttpException);
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(422);
        expect(httpErr.getResponse()).toEqual({
          code: 'WAJAH_TIDAK_TERDETEKSI',
          message: 'Wajah tidak terdeteksi dalam foto',
        });
      }
    });

    it('harus melempar FACE_SERVICE_ERROR 500 saat Python melempar error server internal', async () => {
      const axiosError = new AxiosError('Internal Server Error');
      axiosError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {
          detail: 'Unexpected model crash',
        },
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      httpService.post.mockReturnValueOnce(throwError(() => axiosError));

      try {
        await service.embedFace('crash_image');
        fail('Should have thrown HttpException');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(HttpException);
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(500);
        expect(httpErr.getResponse()).toEqual({
          code: 'FACE_SERVICE_ERROR',
          message: 'Terjadi kesalahan pada face service',
        });
      }
    });

    it('harus melempar FACE_SERVICE_UNAVAILABLE 503 saat timeout (ECONNABORTED) tanpa response', async () => {
      const timeoutError = new AxiosError('timeout of 40000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      // Tanpa response body (karena timeout sebelum server sempat merespons)
      timeoutError.response = undefined;

      httpService.post.mockReturnValueOnce(throwError(() => timeoutError));

      try {
        await service.embedFace('slow_image');
        fail('Should have thrown HttpException');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(HttpException);
        const httpErr = err as HttpException;
        expect(httpErr.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE); // 503
        expect(httpErr.getResponse()).toEqual({
          code: 'FACE_SERVICE_UNAVAILABLE',
          message: 'Face service tidak dapat dihubungi atau timeout',
        });
      }
    });
  });
});
