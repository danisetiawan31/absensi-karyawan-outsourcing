# Backlog — Aplikasi Absensi Karyawan Outsourcing

> Urutan disusun berdasarkan **dependency graph**, bukan alur fitur — tiap item diurutkan
> dari siapa yang jadi prasyarat struktural buat item lain, bukan dari "cerita" fitur.
> Scope backlog ini sengaja dibatasi ke domain yang sudah didiskusikan & disepakati
> urutannya saja ("yang pasti-pasti"), bukan seluruh MVP dari PRD §7 — domain lain
> (leave-requests, dashboard, notifications, reports) akan ditambahkan belakangan
> saat direncanakan, bukan diisi sekarang biar gak basi kalau ada perubahan.

**Status legend:** `READY` (bisa mulai kapan saja) · `BLOCKED` (ada dependency yang belum siap) · `PENDING_DECISION` (nunggu keputusan Anda, referensi ke gap terkait)

---

## Track A — Site & Struktur Organisasi

**Status: SELESAI (A0-A5).** Detail lengkap tiap tahap ada di `done.md` Stage 5, 7, 8, 9, 10.

---

## Track B — Auth Lanjutan (independen dari Track A)

**Status: SELESAI (B1).** Detail lengkap ada di `done.md` Stage 17 dan 18.

---

## Track C — Face Verification & Attendance

**Status: SELESAI (C1-C3).** Detail lengkap ada di `done.md` Stage 20-22.

---

## Track D — Pengajuan Izin (Leave Requests)

**Status: SELESAI (D1-D4 + fallback HR_ADMIN).** Detail lengkap ada di `done.md` Stage 11-16.

**Known limitation yang sudah diselesaikan:** Notifikasi otomatis ke HR_ADMIN untuk pengajuan izin orphaned sudah diimplementasikan, sehingga permasalahan HR yang harus sadar dan memproses manual sudah teratasi.

---

## Track E — Notifikasi & Cron

**Status: SELESAI (E1-E3).** Detail lengkap ada di `done.md` Stage 23-24.

**Technical Debt yang masih berlaku:** Risiko _concurrency antar-tick_ pada _cron job_ jika eksekusi melebihi durasi interval, yang sementara tidak ditangani melalui _mutex lock_ di tahap MVP ini.

---

## Track F — Dashboard & Laporan

**Status: SELESAI (F1-F7).** Detail lengkap ada di `done.md` Stage 25-31.

---

## Track G — Aksi Manual HR (independen penuh)

**Status: SELESAI (G1).** Detail lengkap ada di `done.md` Stage 32.

## Track H — Mobile Foundation & Auth

**Status: SELESAI (H1-H4).** Detail lengkap ada di `done.md` Stage 33-36.

- mobile-foundation (scaffold, axios+interceptor, Zustand auth store, routing guard per-role)
- auth-mobile (login, wajib ganti password, forgot/reset password)

## Track I — Karyawan: Gate & Home

**Status: SELESAI**

- face-registration-mobile - SELESAI
- karyawan-home-jadwal - SELESAI

## Track J — Karyawan: Attendance & Leave

**Status: SELESAI.** Detail lengkap ada di `done.md` Stage 43, 44, dan 45.

- attendance-mobile - **SELESAI**
- leave-requests-karyawan - **SELESAI**
- notifikasi-mobile (karyawan) - **SELESAI**

## Track K — Supervisor

**Status: READY**

- supervisor-dashboard
- supervisor-jadwal-izin
- notifikasi-mobile (supervisor)

## Track L — HR Admin

## Track M — Redis (Infrastruktur Caching & Reliability)

**Status: SELESAI (M1 - redis-cache-dashboard-reports, M2 - redis-rate-limiting-auth).** Detail lengkap ada di `done.md` Stage 41 dan Stage 42.

**Motivasi:** Eksplorasi stack baru untuk portofolio — setiap item dipilih karena punya use case nyata di project ini (bukan ditempel tanpa fungsi), diprioritaskan dari yang paling defensible.

**Catatan:** Item "distributed lock cron" yang sebelumnya direncanakan di sini DIBATALKAN — investigasi ke Antigravity menemukan bahwa cron job Track E adalah 1 runner dalam 1 proses (bukan multi-instance), sehingga race condition antar-tick diselesaikan cukup dengan in-memory mutex (dikerjakan terpisah di Track E, bukan bagian Redis).

- **redis-cache-dashboard-reports** — **SELESAI.** Cache-aside (TTL pendek) untuk endpoint agregasi berat: `GET /dashboard/attendance`, `GET /attendance/summary`, `GET /reports/export`. Termasuk strategi invalidasi cache saat data terkait berubah (check-in/out baru, approve izin, cron auto-mark TIDAK_HADIR).
- **redis-rate-limiting-auth** — **SELESAI.** Menggunakan `@nest-lab/throttler-storage-redis` (`ThrottlerStorageRedisService`) dengan custom `FailOpenThrottlerGuard` untuk endpoint `POST /auth/login` (5x/60s) dan `POST /auth/forgot-password` (3x/300s).
