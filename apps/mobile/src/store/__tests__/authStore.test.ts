import * as SecureStore from 'expo-secure-store';

import { AUTH_STORAGE_KEY, useAuthStore } from '../authStore';
import { AuthData } from '@/types/api';

const mockAuthData: AuthData = {
  accessToken: 'token_abc',
  role: 'KARYAWAN' as const,
  userId: 'usr_1',
  nama: 'Budi',
  wajahTerdaftar: true,
  wajibGantiPassword: false,
};

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(
    JSON.stringify({
      accessToken: 'token_abc',
      role: 'KARYAWAN',
      userId: 'usr_1',
      nama: 'Budi',
      wajahTerdaftar: true,
      wajibGantiPassword: false,
    })
  ),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('authStore', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await useAuthStore.getState().clearAuth();
  });

  it('setAuth updates state and persists full data to SecureStore as JSON', async () => {
    await useAuthStore.getState().setAuth(mockAuthData);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('token_abc');
    expect(state.role).toBe('KARYAWAN');
    expect(state.userId).toBe('usr_1');
    expect(state.nama).toBe('Budi');
    expect(state.wajahTerdaftar).toBe(true);
    expect(state.wajibGantiPassword).toBe(false);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      AUTH_STORAGE_KEY,
      JSON.stringify(mockAuthData)
    );
  });

  it('clearAuth resets state and removes data from SecureStore', async () => {
    await useAuthStore.getState().setAuth(mockAuthData);
    await useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.role).toBeNull();
    expect(state.userId).toBeNull();
    expect(state.nama).toBeNull();
    expect(state.wajahTerdaftar).toBe(false);
    expect(state.wajibGantiPassword).toBe(false);

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
  });

  it('hydrateAuth restores full state from SecureStore and returns true', async () => {
    const isHydrated = await useAuthStore.getState().hydrateAuth();
    expect(isHydrated).toBe(true);
    
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('token_abc');
    expect(state.role).toBe('KARYAWAN');
    expect(state.nama).toBe('Budi');

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
  });

  it('hydrateAuth handles corrupt JSON gracefully, clears store, and returns false', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('invalid json {');
    
    const isHydrated = await useAuthStore.getState().hydrateAuth();
    expect(isHydrated).toBe(false);

    // Memastikan invalid data langsung dihapus
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
  });

  it('hydrateAuth returns false if storage is empty', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    
    const isHydrated = await useAuthStore.getState().hydrateAuth();
    expect(isHydrated).toBe(false);
  });
});
