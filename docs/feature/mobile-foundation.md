# Mobile Foundation

## Konteks & tujuan

Fondasi mutlak sebelum screen apapun bisa dibangun — API client terpusat, auth state, secure token storage, dan routing guard per-role. Semua Track I-L bergantung pada fitur ini. Tidak ada UI screen bisnis di sini (login form dsb masuk `auth-mobile`), murni infrastruktur.

## Requirement

1. Setup Expo Router dengan route groups: `(auth)`, `(karyawan)`, `(supervisor)`, `(hr-admin)` — masing-masing punya `_layout.tsx` sendiri.
2. Env var base URL API via `EXPO_PUBLIC_API_BASE_URL` (native Expo env, prefix `EXPO_PUBLIC_` otomatis ter-inline saat build, tidak perlu `app.config.ts` extra/Constants). Siapkan `.env` (development) dan `.env.production` — isi placeholder, actual value nanti diisi manual.
3. Axios instance terpusat di `services/apiClient.ts`:
   - Base URL dari env var di atas
   - Interceptor request: attach `Authorization: Bearer <token>` dari Zustand auth store
   - Interceptor response: kalau status 401 → clear auth store + SecureStore, redirect ke `(auth)/login`
   - Timeout default wajar (bukan default axios yang unlimited) — kecuali endpoint yang butuh timeout khusus (`/attendance/check-in`, `/attendance/check-out` — set lebih tinggi karena panggilan face-service ~30 detik, lihat AGENTS.md §7)
4. Zustand auth store (`store/authStore.ts`) menyimpan: `accessToken`, `role`, `userId`, `nama`, `wajahTerdaftar`, `wajibGantiPassword`. Sediakan action `setAuth()`, `clearAuth()`.
5. Persist token ke `expo-secure-store` (BUKAN AsyncStorage) setiap kali `setAuth()` dipanggil; hapus saat `clearAuth()`.
6. Root layout (`app/_layout.tsx`): saat app pertama dibuka, baca token dari SecureStore (bukan langsung dari Zustand state yang kosong di cold start) → kalau ada token valid, restore ke Zustand store lalu redirect sesuai `role`; kalau tidak ada, redirect ke `(auth)/login`. Selama proses cek ini tampilkan simple spinner (bukan splash custom, sesuai keputusan MVP).
7. Routing guard per route group: tiap `_layout.tsx` di `(karyawan)/(supervisor)/(hr-admin)` cek `role` di Zustand store — kalau tidak cocok, redirect ke `(auth)/login`. Ini mencegah user manipulasi deep-link ke route group role lain.
8. Types dasar di `types/api.ts`: `SuccessEnvelope<T>`, `ErrorEnvelope` sesuai format response di `API-Contract.md` (§ Format Response Standar) — dipakai semua service lain nantinya, zero `any`.

## Tahapan implementasi

(Catatan: implementasi tetap WAJIB dipecah lebih kecil lagi saat eksekusi di Antigravity — ini cuma pengelompokan tingkat spec, bukan batas 1 prompt.)

- Tahap 1 (Scaffold & config): struktur folder sesuai AGENTS.md §7, install dependencies (expo-router, @tanstack/react-query, zustand, expo-secure-store, axios), setup `.env`/`.env.production`
- Tahap 2 (API client layer): `services/apiClient.ts` + interceptor request/response, `types/api.ts`
- Tahap 3 (Auth store & secure storage): `store/authStore.ts` + integrasi SecureStore
- Tahap 4 (Routing & guard): route groups, root layout dengan cek token cold-start, guard per role
- Tahap 5 (Test): unit test untuk logic kritis (lihat Testing di bawah)

## Edge case yang perlu dihandle

- Token ada di SecureStore tapi sudah expired di backend → request pertama kena 401 → interceptor harus tetap clear & redirect (bukan infinite loop retry)
- SecureStore gagal dibaca (corrupt/permission) → treat sebagai unauthenticated, redirect ke login, jangan crash app
- Role di token tidak match dengan salah satu dari 3 route group yang ada (data korup/bug) → redirect ke login + clear auth, bukan stuck di layar blank

## Testing

- Interceptor: request dengan token → header `Authorization` ter-attach benar
- Interceptor: response 401 → `clearAuth()` terpanggil dan SecureStore ter-hapus
- Auth store: `setAuth()` → state ter-update dan SecureStore ter-tulis
- Auth store: `clearAuth()` → state kosong dan SecureStore ter-hapus
- Routing guard: role tidak cocok dengan route group → redirect terjadi (bisa di-test via mock router atau integration test ringan)

## Kriteria selesai

- App bisa dibuka, cold start cek SecureStore, redirect benar (login jika belum ada token, home sesuai role jika ada)
- Deep-link manual ke route group role lain (misal karyawan coba akses `(hr-admin)`) ter-redirect ke login
- Semua test di atas lolos
- Tidak ada `any` di kode yang ditulis (AGENTS.md §9)
- Direview manual oleh user (belum ada UI bisnis untuk dites end-to-end, tapi struktur & redirect behavior bisa dicek langsung)
