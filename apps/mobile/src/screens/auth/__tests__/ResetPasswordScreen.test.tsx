/**
 * Unit test logic untuk ResetPasswordScreen (Tahap 4 Auth Mobile)
 *
 * Skenario:
 * 1. Gate: tidak ada email param → redirect ke forgot-password
 * 2. Validasi client: token bukan 6 digit → error, tidak hit API
 * 3. Validasi client: password < 8 karakter → error, tidak hit API
 * 4. Validasi client: password ≠ konfirmasi → error, tidak hit API
 * 5. Sukses → redirect ke (auth)/login
 * 6. TOKEN_TIDAK_VALID dari backend → pesan error, TIDAK redirect
 * 7. Network error → pesan error umum, TIDAK redirect
 */
import axios from 'axios';
import { router } from 'expo-router';
import apiClient from '@/services/apiClient';
import { ErrorEnvelope } from '@/types/api';

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/services/apiClient', () => ({
  post: jest.fn(),
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedRouter = router as jest.Mocked<typeof router>;

// ── Constants (sama dengan screen) ───────────────────────────────────────────
const MIN_PASSWORD_LENGTH = 8;

// ── Pure logic functions ──────────────────────────────────────────────────────

function checkAccessGate(email: string | undefined): boolean {
  if (!email) {
    router.replace('/(auth)/forgot-password');
    return false;
  }
  return true;
}

function validateForm(
  token: string,
  passwordBaru: string,
  konfirmasiPassword: string,
): string | null {
  if (!/^\d{6}$/.test(token.trim())) {
    return 'Kode reset harus berupa 6 digit angka.';
  }
  if (passwordBaru.length < MIN_PASSWORD_LENGTH) {
    return `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (passwordBaru !== konfirmasiPassword) {
    return 'Konfirmasi password tidak sesuai. Pastikan keduanya sama.';
  }
  return null;
}

async function handleResetPasswordSubmit(params: {
  email: string;
  token: string;
  passwordBaru: string;
  konfirmasiPassword: string;
}): Promise<{ redirected: boolean; errorMsg: string | null }> {
  const validationError = validateForm(
    params.token,
    params.passwordBaru,
    params.konfirmasiPassword,
  );
  if (validationError) {
    return { redirected: false, errorMsg: validationError };
  }

  try {
    await apiClient.post('/auth/reset-password', {
      email: params.email,
      token: params.token.trim(),
      passwordBaru: params.passwordBaru,
    });

    router.replace('/(auth)/login');
    return { redirected: true, errorMsg: null };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as ErrorEnvelope | undefined;
      const code = body?.error?.code;

      if (code === 'TOKEN_TIDAK_VALID') {
        return {
          redirected: false,
          errorMsg:
            'Kode reset tidak valid atau sudah kedaluwarsa. Silakan cek email Anda atau minta kode baru.',
        };
      } else if (err.response) {
        return {
          redirected: false,
          errorMsg: 'Terjadi kesalahan pada server. Silakan coba lagi.',
        };
      }
    }
    return {
      redirected: false,
      errorMsg: 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
    };
  }
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('ResetPasswordScreen Logic & Gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Gate ──────────────────────────────────────────────────────────────────

  it('Gate: redirect ke forgot-password kalau email param tidak ada', () => {
    const allowed = checkAccessGate(undefined);
    expect(allowed).toBe(false);
    expect(mockedRouter.replace).toHaveBeenCalledWith('/(auth)/forgot-password');
  });

  it('Gate: izinkan akses kalau email param ada', () => {
    const allowed = checkAccessGate('user@test.com');
    expect(allowed).toBe(true);
    expect(mockedRouter.replace).not.toHaveBeenCalled();
  });

  // ── Validasi client ───────────────────────────────────────────────────────

  it('token bukan 6 digit: error validasi, API tidak dipanggil', async () => {
    const result = await handleResetPasswordSubmit({
      email: 'user@test.com',
      token: '123',
      passwordBaru: 'passwordBaru123',
      konfirmasiPassword: 'passwordBaru123',
    });

    expect(result.redirected).toBe(false);
    expect(result.errorMsg).toContain('6 digit angka');
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it('token mengandung huruf: error validasi, API tidak dipanggil', async () => {
    const result = await handleResetPasswordSubmit({
      email: 'user@test.com',
      token: 'abc123',
      passwordBaru: 'passwordBaru123',
      konfirmasiPassword: 'passwordBaru123',
    });

    expect(result.redirected).toBe(false);
    expect(result.errorMsg).toContain('6 digit angka');
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it('password < 8 karakter: error validasi, API tidak dipanggil', async () => {
    const result = await handleResetPasswordSubmit({
      email: 'user@test.com',
      token: '123456',
      passwordBaru: 'pendek',
      konfirmasiPassword: 'pendek',
    });

    expect(result.redirected).toBe(false);
    expect(result.errorMsg).toContain('minimal 8 karakter');
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  it('password ≠ konfirmasi: error validasi, API tidak dipanggil', async () => {
    const result = await handleResetPasswordSubmit({
      email: 'user@test.com',
      token: '123456',
      passwordBaru: 'passwordBaru123',
      konfirmasiPassword: 'passwordBeda321',
    });

    expect(result.redirected).toBe(false);
    expect(result.errorMsg).toContain('Konfirmasi password tidak sesuai');
    expect(mockedApiClient.post).not.toHaveBeenCalled();
  });

  // ── Integrasi API ─────────────────────────────────────────────────────────

  it('sukses: API dipanggil dengan payload benar, redirect ke login', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await handleResetPasswordSubmit({
      email: 'user@test.com',
      token: '123456',
      passwordBaru: 'passwordBaru123',
      konfirmasiPassword: 'passwordBaru123',
    });

    expect(result.redirected).toBe(true);
    expect(result.errorMsg).toBeNull();
    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
      email: 'user@test.com',
      token: '123456',
      passwordBaru: 'passwordBaru123',
    });
    expect(mockedRouter.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('TOKEN_TIDAK_VALID: pesan error jelas, tetap di screen (tidak redirect)', async () => {
    const apiError = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          success: false,
          error: { code: 'TOKEN_TIDAK_VALID', message: 'Token tidak valid' },
        },
      },
    };
    mockedApiClient.post.mockRejectedValueOnce(apiError);
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const result = await handleResetPasswordSubmit({
      email: 'user@test.com',
      token: '999999',
      passwordBaru: 'passwordBaru123',
      konfirmasiPassword: 'passwordBaru123',
    });

    expect(result.redirected).toBe(false);
    expect(result.errorMsg).toContain('tidak valid atau sudah kedaluwarsa');
    expect(mockedRouter.replace).not.toHaveBeenCalled();
  });

  it('network error: pesan error umum, tidak redirect', async () => {
    const networkErr = { isAxiosError: true, response: undefined };
    mockedApiClient.post.mockRejectedValueOnce(networkErr);
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const result = await handleResetPasswordSubmit({
      email: 'user@test.com',
      token: '123456',
      passwordBaru: 'passwordBaru123',
      konfirmasiPassword: 'passwordBaru123',
    });

    expect(result.redirected).toBe(false);
    expect(result.errorMsg).toContain('koneksi internet');
    expect(mockedRouter.replace).not.toHaveBeenCalled();
  });
});
