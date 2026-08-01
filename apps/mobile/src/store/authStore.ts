import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { AuthData, UserRole } from "@/types/api";

export const AUTH_STORAGE_KEY = "user_auth_data";

export interface AuthState {
  accessToken: string | null;
  role: UserRole | null;
  userId: string | null;
  nama: string | null;
  wajahTerdaftar: boolean;
  wajibGantiPassword: boolean;

  /**
   * WAJIB di-clear segera setelah request change-password selesai (sukses/gagal).
   * TIDAK masuk ke SecureStore — hilang kalau app di-kill (by design).
   */
  pendingPasswordLama: string | null;

  setAuth: (data: AuthData) => Promise<void>;
  clearAuth: () => Promise<void>;
  setPendingPasswordLama: (password: string) => void;
  clearPendingPasswordLama: () => void;
  /**
   * Mengembalikan boolean true jika sesi berhasil di-hydrate dari storage.
   */
  hydrateAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  role: null,
  userId: null,
  nama: null,
  wajahTerdaftar: false,
  wajibGantiPassword: false,
  pendingPasswordLama: null,

  setAuth: async (data: AuthData) => {
    try {
      // Simpan seluruh data sesi sebagai JSON string agar bisa di-hydrate penuh saat cold start
      await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Fallback: proceed with memory state update
    }
    set({
      accessToken: data.accessToken,
      role: data.role,
      userId: data.userId,
      nama: data.nama,
      wajahTerdaftar: data.wajahTerdaftar,
      wajibGantiPassword: data.wajibGantiPassword,
    });
  },

  clearAuth: async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    } catch {
      // Fallback: proceed with memory state reset
    }
    set({
      accessToken: null,
      role: null,
      userId: null,
      nama: null,
      wajahTerdaftar: false,
      wajibGantiPassword: false,
    });
  },

  setPendingPasswordLama: (password: string) => {
    set({ pendingPasswordLama: password });
  },

  clearPendingPasswordLama: () => {
    set({ pendingPasswordLama: null });
  },

  hydrateAuth: async () => {
    try {
      const authDataStr = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
      if (!authDataStr) return false;

      const data: AuthData = JSON.parse(authDataStr);
      set({
        accessToken: data.accessToken,
        role: data.role,
        userId: data.userId,
        nama: data.nama,
        wajahTerdaftar: data.wajahTerdaftar,
        wajibGantiPassword: data.wajibGantiPassword,
      });
      return true;
    } catch {
      // Corrupt data / parse error -> clear broken state & treat as unauthenticated
      await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY).catch(() => {});
      return false;
    }
  },
}));
