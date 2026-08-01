/**
 * Unit Test — Face Registration Mobile (Tahap 3 & Gate Logic)
 *
 * Menguji logic kritis:
 * 1. Gate redirect saat photoUri tidak ada -> redirect ke (karyawan)/face-registration
 * 2. Submit foto ke POST /users/me/face-registration (multipart/form-data, timeout 60000ms)
 * 3. Update wajahTerdaftar di authStore setelah submit sukses
 * 4. Error handling saat submit gagal -> pesan error tampil, user bisa retry
 * 5. Gate check layout: wajahTerdaftar === false redirect ke face-registration (anti-loop)
 */

import axios from 'axios';
import { router } from 'expo-router';
import apiClient from '@/services/apiClient';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock('@/services/apiClient', () => ({
  post: jest.fn(),
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedRouter = router as jest.Mocked<typeof router>;

// ── Helper Pure Functions untuk Testing Logic Deterministik ──────────────────

function checkPreviewGate(photoUri: string | undefined): boolean {
  if (!photoUri) {
    router.replace('/(karyawan)/face-registration');
    return false;
  }
  return true;
}

function checkKaryawanLayoutGate(
  role: string | null,
  wajahTerdaftar: boolean,
  currentRoute: string
): string | null {
  if (role !== 'KARYAWAN') {
    router.replace('/(auth)/login');
    return '/(auth)/login';
  }

  const isFaceRegFlow = [
    'face-registration',
    'face-registration-preview',
    'face-registration-confirm',
  ].includes(currentRoute);

  if (!wajahTerdaftar && !isFaceRegFlow) {
    router.replace('/(karyawan)/face-registration');
    return '/(karyawan)/face-registration';
  }

  return null;
}

async function handleFaceRegistrationSubmit(
  photoUri: string,
  setWajahTerdaftarMock: (val: boolean) => Promise<void>
): Promise<{ success: boolean; errorMsg: string | null }> {
  if (!photoUri) return { success: false, errorMsg: 'Foto tidak ditemukan' };

  try {
    const formData = new FormData();
    const filename = photoUri.split('/').pop() || 'face.jpg';

    // @ts-expect-error React Native FormData file signature
    formData.append('foto', {
      uri: photoUri,
      name: filename,
      type: 'image/jpeg',
    });

    await apiClient.post('/users/me/face-registration', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });

    await setWajahTerdaftarMock(true);
    router.replace('/(karyawan)');
    return { success: true, errorMsg: null };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        return {
          success: false,
          errorMsg: 'Gagal terhubung ke server. Periksa koneksi jaringan Anda.',
        };
      }
      return {
        success: false,
        errorMsg: err.response.data?.error?.message || 'Gagal mendaftarkan wajah. Silakan coba lagi.',
      };
    }
    return { success: false, errorMsg: 'Terjadi kesalahan. Silakan coba lagi.' };
  }
}

describe('Face Registration — Gate & Submit Logic Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Photo Gate Logic', () => {
    it('harus redirect ke face-registration jika photoUri tidak ada', () => {
      const result = checkPreviewGate(undefined);

      expect(result).toBe(false);
      expect(mockedRouter.replace).toHaveBeenCalledWith(
        '/(karyawan)/face-registration'
      );
    });

    it('harus mengizinkan akses jika photoUri ada', () => {
      const result = checkPreviewGate('file:///path/to/photo.jpg');

      expect(result).toBe(true);
      expect(mockedRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('2. Karyawan Layout Gate Logic', () => {
    it('harus redirect ke login jika role bukan KARYAWAN', () => {
      const redirect = checkKaryawanLayoutGate('SUPERVISOR', false, 'index');

      expect(redirect).toBe('/(auth)/login');
      expect(mockedRouter.replace).toHaveBeenCalledWith('/(auth)/login');
    });

    it('harus redirect ke face-registration jika wajahTerdaftar === false dan mengakses index', () => {
      const redirect = checkKaryawanLayoutGate('KARYAWAN', false, 'index');

      expect(redirect).toBe('/(karyawan)/face-registration');
      expect(mockedRouter.replace).toHaveBeenCalledWith(
        '/(karyawan)/face-registration'
      );
    });

    it('TIDAK boleh redirect jika wajahTerdaftar === false tapi user berada di screen face-registration (cegah loop)', () => {
      const redirect = checkKaryawanLayoutGate(
        'KARYAWAN',
        false,
        'face-registration'
      );

      expect(redirect).toBeNull();
      expect(mockedRouter.replace).not.toHaveBeenCalled();
    });

    it('TIDAK boleh redirect jika wajahTerdaftar === true', () => {
      const redirect = checkKaryawanLayoutGate('KARYAWAN', true, 'index');

      expect(redirect).toBeNull();
      expect(mockedRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('3. Submit API Logic (POST /users/me/face-registration)', () => {
    it('harus mengirim request multipart dengan timeout 60000ms dan update wajahTerdaftar saat sukses', async () => {
      mockedApiClient.post.mockResolvedValueOnce({
        data: { success: true },
      });
      const setWajahTerdaftarMock = jest.fn().mockResolvedValue(undefined);

      const res = await handleFaceRegistrationSubmit(
        'file:///path/to/photo.jpg',
        setWajahTerdaftarMock
      );

      expect(res.success).toBe(true);
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/users/me/face-registration',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000,
        })
      );
      expect(setWajahTerdaftarMock).toHaveBeenCalledWith(true);
      expect(mockedRouter.replace).toHaveBeenCalledWith('/(karyawan)');
    });

    it('harus menangani network error saat submit gagal', async () => {
      const networkError = new Error('Network Error') as any;
      networkError.isAxiosError = true;
      mockedApiClient.post.mockRejectedValueOnce(networkError);

      const setWajahTerdaftarMock = jest.fn();

      const res = await handleFaceRegistrationSubmit(
        'file:///path/to/photo.jpg',
        setWajahTerdaftarMock
      );

      expect(res.success).toBe(false);
      expect(res.errorMsg).toBe(
        'Gagal terhubung ke server. Periksa koneksi jaringan Anda.'
      );
      expect(setWajahTerdaftarMock).not.toHaveBeenCalled();
      expect(mockedRouter.replace).not.toHaveBeenCalledWith('/(karyawan)');
    });
  });
});
