# Redis Cache — Dashboard & Reports

## Konteks & tujuan

Endpoint agregasi berat (`GET /dashboard/attendance`, `GET /attendance/summary`, `GET /reports/export`) melakukan query langsung ke database setiap request, padahal traffic-nya berulang dalam window waktu pendek — supervisor refresh dashboard berkali-kali, HR generate laporan periode yang sama lebih dari sekali. Fitur ini menambahkan cache-aside layer berbasis Redis, dengan strategi TTL dan invalidasi yang dibedakan sesuai karakteristik freshness masing-masing data (near-real-time untuk dashboard vs. historis untuk summary/reports).

Tujuan sekunder (portofolio): demonstrasi pattern cache-aside manual (bukan decorator framework), strategi invalidasi granular berbasis reverse-lookup relasi, dan fail-open behavior saat Redis unavailable.

## Requirement

1. Redis service tersedia di `docker-compose.yml` untuk dev lokal, dependency `ioredis` terpasang.
2. `CacheService` reusable di `common/` dengan method generic `get<T>`, `set<T>`, `del`, `delByPattern` (atau sejenis) — fail-open: kalau Redis error/timeout, treat sebagai cache miss / no-op, JANGAN lempar exception ke caller.
3. `getAttendanceDashboard()` di-cache dengan key `dashboard:attendance:{supervisorId}:{tanggal}`, TTL 30 detik.
4. `getAttendanceSummary()` di-cache dengan key `attendance:summary:{periodeMulai}:{periodeSelesai}`, TTL 5 menit. Karena `generateAttendanceReport()` memanggil method ini langsung (reuse), `/reports/export` otomatis ikut ter-cache tanpa perubahan tambahan di `reports.controller.ts`/service-nya.
5. Invalidasi eksplisit untuk dashboard cache, dipicu **setelah** write DB berhasil (bukan sebelum), di titik-titik:
   - `AttendanceService.checkIn()`
   - `AttendanceService.checkOut()`
   - `LeaveRequestsService.processRequest()` (action `APPROVED` maupun `REJECTED`)
   - `AttendanceCronService.checkAndMarkAbsent()`
6. Invalidasi dashboard pakai 1 helper reusable `invalidateDashboardCache(siteId, tanggal)` yang melakukan reverse-lookup `SupervisorSite` (siteId → semua supervisorId yang mengawasi site itu) lalu hapus cache key masing-masing.
7. Untuk `processRequest()`, karena 1 pengajuan izin mencakup rentang tanggal yang bisa meliputi beberapa `JadwalShift` (berpotensi beda site) — query semua `JadwalShift` karyawan tsb dalam rentang tanggal pengajuan, ambil kombinasi unik `(siteId, tanggal)`, panggil `invalidateDashboardCache` untuk masing-masing kombinasi.
8. Serialisasi/deserialisasi data cache WAJIB menjaga bentuk field `Date` konsisten antara cache-hit dan cache-miss (`JSON.parse` mengembalikan string, bukan objek `Date`) — putuskan 1 pendekatan (mis. re-hydrate setelah parse, atau pastikan consumer downstream memang mengharapkan string ISO di kedua kasus) lalu konsisten di semua titik.
9. `getAttendanceSummary()` TIDAK punya invalidasi eksplisit — rely sepenuhnya pada TTL 5 menit (sengaja: data historis, toleransi staleness tinggi).
10. Semua operasi Redis (read maupun invalidasi) WAJIB fail-open — Redis down/timeout tidak boleh membuat check-in/check-out/approve/reject izin ikut gagal, cukup log warning.

## Tahapan implementasi

Fitur ini tidak menyentuh `schema.prisma` maupun UI mobile, jadi tahapan diadaptasi dari urutan baku (infra → data layer → test), dipecah lebih granular karena scope-nya melintasi banyak modul:

- **Tahap 1 (Infra & base layer):** service `redis` di `docker-compose.yml`, `REDIS_HOST`/`REDIS_PORT` di `.env`/`.env.example`, dependency `ioredis`, `CacheService` dasar di `common/` (fail-open).
- **Tahap 2 (Data layer — dashboard):** caching di `getAttendanceDashboard()`, termasuk penanganan serialisasi `Date`.
- **Tahap 3 (Data layer — summary/reports):** caching di `getAttendanceSummary()`, verifikasi `generateAttendanceReport()` otomatis ikut ter-cache tanpa perubahan tambahan.
- **Tahap 4 (Data layer — invalidasi):** helper `invalidateDashboardCache(siteId, tanggal)`, pasang hook di `checkIn()`, `checkOut()`, `processRequest()` (approve & reject), `checkAndMarkAbsent()`.
- **Tahap 5 (Test):** sesuai section Testing di bawah.

## Skema/struktur data (kalau relevan)

Tidak ada perubahan `schema.prisma`. Tidak ada tabel/field baru — state cache murni di Redis, tidak persisten di Postgres.

## Edge case yang perlu dihandle

- Redis unreachable/timeout saat read maupun invalidasi → fail-open, log warning, operasi utama tetap sukses.
- Invalidasi terjadi SETELAH write DB commit, bukan sebelum — mencegah cache terisi ulang dengan data lama akibat race antara invalidasi dan commit.
- 1 pengajuan izin bisa mencakup beberapa `JadwalShift` lintas tanggal (berpotensi lintas site) → invalidasi loop semua kombinasi `(siteId, tanggal)` yang relevan, bukan asumsi 1 site/1 tanggal.
- Perubahan assignment supervisor-site (`POST`/`DELETE /supervisor-sites`) SENGAJA tidak memicu invalidasi eksplisit — known limitation, self-heal via TTL 30 detik. Catat di komentar kode dan `done.md`, jangan didiamkan tanpa jejak.
- Field `Date` dari Prisma perlu ditangani eksplisit saat serialize/deserialize JSON supaya bentuk data konsisten antara cache-hit dan cache-miss.

## Testing

- `CacheService`: test `get`/`set`/`del` normal (mock/in-memory Redis client atau `ioredis-mock`), dan test fail-open — simulasikan Redis client throw/timeout, assert method tetap resolve tanpa exception (return `null` untuk `get`, no-op untuk `set`/`del`).
- `getAttendanceDashboard()`: assert cache-hit tidak melakukan query Prisma kedua (spy `prisma.jadwalShift.findMany` tidak terpanggil saat cache hit); assert cache-miss melakukan query lalu menyimpan hasil ke cache dengan TTL yang benar.
- `getAttendanceSummary()`: assert perilaku cache-hit/miss serupa; assert `generateAttendanceReport()` yang memanggilnya juga mendapat manfaat cache (tidak duplicate query saat dipanggil 2x dengan periode sama).
- Invalidasi: assert `checkIn()`/`checkOut()`/`processRequest()` (approve & reject)/`checkAndMarkAbsent()` memanggil `invalidateDashboardCache` dengan `siteId`+`tanggal` yang benar, dan HANYA setelah write DB berhasil.
- Invalidasi leave request lintas beberapa `JadwalShift`: assert helper dipanggil untuk SETIAP kombinasi unik `(siteId, tanggal)` yang relevan, bukan cuma sekali.
- Assert kalau write DB gagal (exception di tengah), invalidasi TIDAK terpanggil.

## Kriteria selesai

- Semua requirement di atas terimplementasi sesuai 5 tahap, masing-masing di-review & approve terpisah sebelum lanjut ke tahap berikutnya.
- Semua test di atas lolos, termasuk full suite (`npm run test` tanpa scope) dijalankan sebelum entry `done.md` gabungan ditulis (AGENTS.md §5).
- Verifikasi manual oleh user: matikan Redis (stop container) → endpoint dashboard/summary/reports tetap berfungsi normal (fail-open teruji nyata, bukan cuma mock).
- Verifikasi manual: check-in dari 1 karyawan, refresh dashboard supervisor dalam <30 detik → data baru langsung muncul (membuktikan invalidasi jalan, bukan cuma rely TTL).
