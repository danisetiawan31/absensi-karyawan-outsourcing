# Redis Rate Limiting — Auth Endpoints

## Konteks & tujuan

Backlog awal (`Track M`) mendeskripsikan task ini sebagai "ganti storage @nestjs/throttler dari in-memory ke Redis" — investigasi menemukan `@nestjs/throttler` ternyata belum pernah dipasang sama sekali di project ini. Task ini dikoreksi jadi: implementasi rate limiting dari nol, dengan Redis sebagai storage sejak awal (bukan migrasi storage).

Scope dibatasi ke 2 endpoint yang rentan brute-force/abuse: `POST /auth/login` (credential stuffing) dan `POST /auth/forgot-password` (email flooding lewat Resend).

## Requirement

1. Install `@nestjs/throttler` dan `@nest-lab/throttler-storage-redis` (package aktif di-maintain — versi lama `nestjs-throttler-storage-redis` sudah deprecated, jangan dipakai). Dependency `ioredis` sudah tersedia dari fitur cache sebelumnya.
2. `ThrottlerModule` dikonfigurasi dengan storage `ThrottlerStorageRedisService`, pakai instance `ioredis` baru dengan `REDIS_HOST`/`REDIS_PORT` dari `.env` (reuse config, bukan reuse instance internal `CacheService` — `CacheService` tidak expose raw client-nya).
3. Guard TIDAK didaftarkan sebagai `APP_GUARD` global — dipasang eksplisit cuma di 2 endpoint via `@UseGuards()` + `@Throttle()`.
4. Rate limit values:
   - `POST /auth/login`: limit 5, ttl 60 detik, per IP (default tracker, tidak perlu custom `getTracker()`).
   - `POST /auth/forgot-password`: limit 3, ttl 300 detik, per IP.
5. Buat custom guard `FailOpenThrottlerGuard extends ThrottlerGuard` yang:
   - Override method yang relevan untuk catch error dari storage Redis (connection error/timeout) → kalau terjadi, ALLOW request lewat (return true / lanjut ke handler), JANGAN throw/block. Log warning saat ini terjadi.
   - Override method pelempar exception (`throwThrottlingException` atau setara) supaya throw dengan format `{ code: 'TERLALU_BANYAK_PERCOBAAN', message: 'Terlalu banyak percobaan, coba lagi nanti' }`, HTTP status 429 — BUKAN default message plain text dari library.

## Skema/struktur data

Tidak ada perubahan `schema.prisma`. State rate limit murni di Redis (key/counter internal milik `@nest-lab/throttler-storage-redis`), tidak ada tabel baru.

## Edge case yang perlu dihandle

- Redis unreachable/timeout → fail-open (request tetap lewat), bukan fail-closed (bukan 500), sesuai keputusan desain di atas. Ini beda arah dari behavior default library, jadi WAJIB diverifikasi eksplisit, bukan diasumsikan otomatis benar.
- Response format saat kena limit WAJIB ikut envelope project (`{ success: false, error: { code, message }, meta }`), bukan default exception message dari `@nestjs/throttler`.
- Endpoint lain di luar `login`/`forgot-password` TIDAK boleh terpengaruh sama sekali oleh perubahan ini (karena guard scoped, bukan global) — perlu dipastikan lewat test negatif.

## Testing

- Login: assert percobaan ke-6 dalam window 60 detik dari IP yang sama menghasilkan 429 dengan `code: 'TERLALU_BANYAK_PERCOBAAN'`; assert percobaan ke-1 sampai ke-5 tetap lolos guard (lanjut ke logic auth normal, entah sukses/gagal password itu urusan logic lain).
- Forgot-password: assert perilaku setara dengan limit 3/300 detik.
- Fail-open: simulasikan storage Redis throw/timeout (mock), assert request TETAP lolos guard (tidak dapat 429 ataupun 500) — ini test PALING penting di fitur ini, jangan sampai terlewat.
- Assert endpoint lain (pilih 1-2 sampel, mis. `GET /schedules/today`) TIDAK terpengaruh sama sekali — tidak ada guard baru yang ke-attach di sana.
- Assert format response error 429 sesuai envelope project (`success: false`, `error.code`, `error.message`), bukan format default library.

## Kriteria selesai

- Semua requirement di atas terimplementasi dalam 1 tahap kerja (scope-nya kecil & fokus, tidak lintas banyak module seperti fitur cache sebelumnya).
- Semua test di atas lolos.
- Verifikasi manual: matikan Redis, coba login berkali-kali (lebih dari 5x) — pastikan tetap bisa lolos ke logic auth (bukan diblokir 429 palsu ataupun error 500) karena fail-open.
- Verifikasi manual: Redis nyala, coba login salah password 6x berturut-turut dari device yang sama — pastikan percobaan ke-6 dapat 429 dengan pesan yang jelas.
- `API-Contract.md` sudah di-update manual oleh user dengan error code baru (di luar scope Antigravity).
