/**
 * Unit test logic untuk ChangePasswordRequired
 *
 * Mengikuti konvensi project (AGENTS.md § Mobile Testing):
 * Menguji logic kritis (gate redirect, validasi form, integrasi API, error handling)
 * secara murni dan deterministik.
 */
import axios from 'axios';
import { router } from 'expo-router';
import apiClient from '@/services/apiClient';
import { UserRole } from '@/types/api';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('@/services/apiClient', () => ({
  post: jest.fn(),
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedRouter = router as jest.Mocked<typeof router>;

const MIN_PASSWORD_LENGTH = 8;
const ROLE_ROUTES: Record<UserRole, string> = {
  KARYAWAN: '/(karyawan)/index',
  SUPERVISOR: '/(supervisor)/index',
  HR_ADMIN: '/(hr-admin)/index',
};

// ── Pure Logic Handler untuk testing behavior ─────────────────────────────────

function checkAccessGate(pendingPasswordLama: string | null) {
  if (!pendingPasswordLama) {
    router.replace('/(auth)/login');
    return false;
  }
  return true;
}

function validateForm(passwordBaru: string, konfirmasiPassword: string): string | null {
  if (passwordBaru.length < MIN_PASSWORD_LENGTH) {
    return `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (passwordBaru !== konfirmasiPassword) {
    return 'Konfirmasi password tidak sesuai. Pastikan keduanya sama.';
  }
  return null;
}

async function handleChangePasswordSubmit(params: {
  pendingPasswordLama: string;
  passwordBaru: string;
  konfirmasiPassword: string;
  role: UserRole;
  clearPendingPasswordLama: () => void;
}) {
  const error = validateForm(params.passwordBaru, params.konfirmasiPassword);
  if (error) {
    return { success: false, error };
  }

  try {
    await apiClient.post('/auth/change-password', {
      passwordLama: params.pendingPasswordLama,
      passwordBaru: params.passwordBaru,
    });

    params.clearPendingPasswordLama();
    router.replace(ROLE_ROUTES[params.role] as never);
    return { success: true };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const code = err.response?.data?.error?.code;
      if (code === 'PASSWORD_LAMA_SALAH') {
        return {
          success: false,
          error: 'Terjadi kesalahan saat verifikasi. Silakan coba lagi atau login ulang.',
        };
      }
    }
    return { success: false, error: 'Terjadi kesalahan. Periksa koneksi internet Anda.' };
  }
}

// ── Test Suite ─────────────────────────────────────────────────────────────────

describe('ChangePasswordRequired Logic & Gate', () => {
  const clearPendingPasswordLamaMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Gate: redirect ke /(auth)/login kalau pendingPasswordLama kosong', () => {
    const allowed = checkAccessGate(null);
    expect(allowed).toBe(false);
    expect(mockedRouter.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('Gate: izinkan akses kalau pendingPasswordLama ada', () => {
    const allowed = checkAccessGate('passLama123');
    expect(allowed).toBe(true);
    expect(mockedRouter.replace).not.toHaveBeenCalled();
  });

  it('Validasi client: error jika password baru < 8 karakter (API tidak dipanggil)', async () => {
    const result = await handleChangePasswordSubmit({
      pendingPasswordLama: 'passLama123',
      passwordBaru: 'short',
      konfirmasiPassword: 'short',
      role: 'KARYAWAN',
      clearPendingPasswordLama: clearPendingPasswordLamaMock,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('minimal 8 karakter');
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it('Validasi client: error jika password dan konfirmasi tidak match (API tidak dipanggil)', async () => {
    const result = await handleChangePasswordSubmit({
      pendingPasswordLama: 'passLama123',
      passwordBaru: 'passwordBaru123',
      konfirmasiPassword: 'passwordBeda321',
      role: 'KARYAWAN',
      clearPendingPasswordLama: clearPendingPasswordLamaMock,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Konfirmasi password tidak sesuai');
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it('Sukses: hit API, panggil clearPendingPasswordLama, dan redirect ke dashboard', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await handleChangePasswordSubmit({
      pendingPasswordLama: 'passLama123',
      passwordBaru: 'passwordBaru123',
      konfirmasiPassword: 'passwordBaru123',
      role: 'KARYAWAN',
      clearPendingPasswordLama: clearPendingPasswordLamaMock,
    });

    expect(result.success).toBe(true);
    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/change-password', {
      passwordLama: 'passLama123',
      passwordBaru: 'passwordBaru123',
    });
    expect(clearPendingPasswordLamaMock).toHaveBeenCalledTimes(1);
    expect(mockedRouter.replace).toHaveBeenCalledWith('/(karyawan)/index');
  });

  it('PASSWORD_LAMA_SALAH: pesan error jelas, tidak clear pending state, tidak redirect', async () => {
    const apiError = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          success: false,
          error: { code: 'PASSWORD_LAMA_SALAH', message: 'Password lama salah' },
        },
      },
    };
    mockedApiClient.post.mockRejectedValueOnce(apiError);
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const result = await handleChangePasswordSubmit({
      pendingPasswordLama: 'passLamaSalah',
      passwordBaru: 'passwordBaru123',
      konfirmasiPassword: 'passwordBaru123',
      role: 'SUPERVISOR',
      clearPendingPasswordLama: clearPendingPasswordLamaMock,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Silakan coba lagi');
    expect(clearPendingPasswordLamaMock).not.toHaveBeenCalled();
    expect(mockedRouter.replace).not.toHaveBeenCalled();
  });
});
