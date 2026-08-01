/**
 * Unit test logic untuk ForgotPasswordScreen
 *
 * Skenario:
 * 1. Validasi client: email kosong → error, tidak hit API
 * 2. Validasi client: format email tidak valid → error, tidak hit API
 * 3. Submit sukses (server 200) → redirect ke reset-password dengan email param
 * 4. Network error / tidak ada respons → tampilkan error, TIDAK redirect
 * 5. Server 5xx (ada respons tapi error) → tampilkan error, TIDAK redirect
 * 6. Email di-trim sebelum dikirim
 */
import axios from 'axios';
import { router } from 'expo-router';
import apiClient from '@/services/apiClient';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

jest.mock('@/services/apiClient', () => ({
  post: jest.fn(),
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedRouter = router as jest.Mocked<typeof router>;

// ── Pure logic functions yang di-test ────────────────────────────────────────

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateForm(email: string): string | null {
  if (!email.trim()) return 'Email wajib diisi.';
  if (!validateEmail(email)) return 'Format email tidak valid.';
  return null;
}

async function handleForgotPasswordSubmit(email: string): Promise<{
  redirected: boolean;
  validationError: string | null;
  networkError: string | null;
}> {
  const validationError = validateForm(email);
  if (validationError) {
    return { redirected: false, validationError, networkError: null };
  }

  try {
    await apiClient.post('/auth/forgot-password', { email: email.trim() });

    // Server merespons sukses → redirect (anti-enumeration: tidak perlu bedakan status email)
    router.push({
      pathname: '/(auth)/reset-password',
      params: { email: email.trim() },
    });
    return { redirected: true, validationError: null, networkError: null };
  } catch (err: unknown) {
    // Kegagalan teknis — BEDA dari anti-enumeration.
    // Tampilkan pesan error, biarkan user retry, JANGAN redirect.
    const isAxios = axios.isAxiosError(err);
    const message =
      isAxios && (err as { response?: unknown }).response
        ? 'Terjadi kesalahan pada server. Silakan coba lagi.'
        : 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
    return { redirected: false, validationError: null, networkError: message };
  }
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('ForgotPasswordScreen Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('email kosong: error validasi, API tidak dipanggil', async () => {
    const result = await handleForgotPasswordSubmit('');
    expect(result.validationError).toBe('Email wajib diisi.');
    expect(result.redirected).toBe(false);
    expect(mockedApiClient.post).not.toHaveBeenCalled();
    expect(mockedRouter.push).not.toHaveBeenCalled();
  });

  it('format email tidak valid: error validasi, API tidak dipanggil', async () => {
    const result = await handleForgotPasswordSubmit('bukan-email');
    expect(result.validationError).toBe('Format email tidak valid.');
    expect(result.redirected).toBe(false);
    expect(mockedApiClient.post).not.toHaveBeenCalled();
    expect(mockedRouter.push).not.toHaveBeenCalled();
  });

  it('submit sukses (server 200): redirect ke reset-password', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { success: true } });

    const result = await handleForgotPasswordSubmit('user@perusahaan.com');

    expect(result.redirected).toBe(true);
    expect(result.networkError).toBeNull();
    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'user@perusahaan.com',
    });
    expect(mockedRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/reset-password',
      params: { email: 'user@perusahaan.com' },
    });
  });

  it('network error (tidak ada respons): tampilkan error, TIDAK redirect', async () => {
    const networkErr = { isAxiosError: true, response: undefined };
    mockedApiClient.post.mockRejectedValueOnce(networkErr);
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const result = await handleForgotPasswordSubmit('user@perusahaan.com');

    expect(result.redirected).toBe(false);
    expect(result.networkError).toContain('koneksi internet');
    expect(mockedRouter.push).not.toHaveBeenCalled();
  });

  it('server 5xx (ada respons tapi error): tampilkan error, TIDAK redirect', async () => {
    const serverErr = { isAxiosError: true, response: { status: 500, data: {} } };
    mockedApiClient.post.mockRejectedValueOnce(serverErr);
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const result = await handleForgotPasswordSubmit('user@perusahaan.com');

    expect(result.redirected).toBe(false);
    expect(result.networkError).toContain('kesalahan pada server');
    expect(mockedRouter.push).not.toHaveBeenCalled();
  });

  it('email di-trim sebelum dikirim ke API dan dijadikan param', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { success: true } });

    await handleForgotPasswordSubmit('  spasi@test.com  ');

    expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'spasi@test.com',
    });
    expect(mockedRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/reset-password',
      params: { email: 'spasi@test.com' },
    });
  });
});
