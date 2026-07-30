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

## Track C — Face Service (paralel, independen penuh)

Kenapa boleh paralel: microservice ini stateless, satu-satunya endpoint-nya (`/internal/embed`)
gak nyentuh Postgres/JadwalShift/Site sama sekali — beda dari endpoint NestJS yang _manggil_ dia.

| #   | Task                                                                        | Kenapa urutan segini                                                                               | Status                |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------- |
| C1  | Python microservice: `POST /internal/embed` (DeepFace embedding + liveness) | Gak depend ke apapun di Track A/B — boleh dikerjakan kapan saja, termasuk bersamaan dengan Track A | `DONE`                |
| C2  | `POST /users/me/face-registration` (NestJS, manggil `/internal/embed`)      | Butuh C1 jadi dulu, kalau enggak endpoint ini selalu gagal saat ditest                             | `DONE`                |
| C3  | `POST /attendance/check-in`, `POST /attendance/check-out`                   | Butuh C1 (face verification) dan jadwal shift yang sudah ready di A5                               | `BLOCKED` — nunggu C1 |

---

## Track D — Pengajuan Izin (Leave Requests)

**Status: SELESAI (D1-D4 + fallback HR_ADMIN).** Detail lengkap ada di `done.md` Stage 11-16.

**Known limitation yang masih berlaku** (belum ada resolusi, cuma partial teratasi oleh fallback HR): karyawan yang belum punya `JadwalShift` sama sekali di rentang tanggal izinnya tetap butuh HR sadar & proses manual — belum ada notifikasi otomatis ke HR soal pengajuan orphaned ini.

---

## Track E — Notifikasi & Cron

| #   | Task                                                                               | Kenapa urutan segini                                                                                                                                                                                          | Status                    |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| E1  | `GET /notifications` (shared Karyawan+Supervisor), `PATCH /notifications/:id/read` | Model `Notifikasi` independen secara struktur. Tapi TANPA trigger yang nulis ke tabel ini (lihat E2/E3), endpoint ini bakal selalu kosong — bisa dibangun sekarang tapi manfaatnya baru kerasa setelah E2/E3. | `READY` (secara struktur) |
| E2  | Cron: reminder T+5 menit belum check-in (ke Karyawan)                              | Butuh data check-in beneran buat tau siapa yang "belum check-in" — depend ke Track C3 (belum ada).                                                                                                            | `BLOCKED` — nunggu C3     |
| E3  | Cron: alert T+15 menit (ke Supervisor) + auto-mark `TIDAK_HADIR`                   | Sama kayak E2, butuh data `LogKehadiran`/`PercobaanAbsensi` real — depend ke C3.                                                                                                                              | `BLOCKED` — nunggu C3     |

---

## Track F — Dashboard & Laporan

| #   | Task                                                              | Kenapa urutan segini                                                                                                                               | Status                |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| F1  | `GET /employees/available?tanggal=&siteId=`                       | Cuma butuh `JadwalShift` (A5, `DONE`) — nyari karyawan yang BELUM ada jadwal di tanggal itu. Gak nyentuh data kehadiran sama sekali.               | `READY`               |
| F2  | `GET /employees/:id/schedules?tanggalMulai=&tanggalSelesai=` (HR) | Cuma butuh `JadwalShift` (A5, `DONE`) — ini eks-Gap 3 lama, kontraknya udah resmi, tinggal dieksekusi.                                             | `READY`               |
| F3  | `GET /schedules/today` (Karyawan)                                 | Bagian jadwalnya siap (A5), tapi field `statusKehadiran` butuh `LogKehadiran` buat akurat — depend ke C3 biar gak selalu nampilin `BELUM_CHECKIN`. | `BLOCKED` — nunggu C3 |
| F4  | `GET /dashboard/attendance?tanggal=`                              | Butuh `SupervisorSite` (A4, `DONE`) buat scoping, DAN `LogKehadiran` buat status real-time — depend ke C3.                                         | `BLOCKED` — nunggu C3 |
| F5  | `GET /dashboard/unfilled-shifts?tanggal=`                         | Sama kayak F4, "belum ter-cover T+15" butuh data check-in real — depend ke C3.                                                                     | `BLOCKED` — nunggu C3 |
| F6  | `GET /attendance/summary`, `GET /attendance/attempts` (HR)        | Butuh `LogKehadiran`/`PercobaanAbsensi` beneran ada isinya — depend ke C3.                                                                         | `BLOCKED` — nunggu C3 |
| F7  | `GET /reports/export?format=pdf\|xlsx`                            | Butuh data dari F6 buat digenerate — depend ke C3 (tidak langsung, lewat F6).                                                                      | `BLOCKED` — nunggu C3 |

---

## Track G — Aksi Manual HR (independen penuh)

| #   | Task                                          | Kenapa urutan segini                                                                                                                         | Status  |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| G1  | `POST /employees/:id/reset-face-registration` | Cuma nge-reset `faceEmbedding` jadi array kosong — TIDAK manggil Python microservice sama sekali, jadi TIDAK depend ke C1 (beda dari C2/C3). | `READY` |
