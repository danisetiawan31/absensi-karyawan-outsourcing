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

**Known limitation yang masih berlaku** (belum ada resolusi, cuma partial teratasi oleh fallback HR): karyawan yang belum punya `JadwalShift` sama sekali di rentang tanggal izinnya tetap butuh HR sadar & proses manual — belum ada notifikasi otomatis ke HR soal pengajuan orphaned ini.

---

## Track E — Notifikasi & Cron

**Status: SELESAI (E1-E3).** Detail lengkap ada di `done.md` Stage 23-24.

**Technical Debt yang masih berlaku:** Risiko _concurrency antar-tick_ pada _cron job_ jika eksekusi melebihi durasi interval, yang sementara tidak ditangani melalui _mutex lock_ di tahap MVP ini.

---

## Track F — Dashboard & Laporan

| #   | Task                                                              | Kenapa urutan segini                                                                                                                               | Status  |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| F1  | `GET /employees/available?tanggal=&siteId=`                       | Cuma butuh `JadwalShift` (A5, `DONE`) — nyari karyawan yang BELUM ada jadwal di tanggal itu. Gak nyentuh data kehadiran sama sekali.               | `DONE`  |
| F2  | `GET /employees/:id/schedules?tanggalMulai=&tanggalSelesai=` (HR) | Cuma butuh `JadwalShift` (A5, `DONE`) — ini eks-Gap 3 lama, kontraknya udah resmi, tinggal dieksekusi.                                             | `DONE`  |
| F3  | `GET /schedules/today` (Karyawan)                                 | Bagian jadwalnya siap (A5), tapi field `statusKehadiran` butuh `LogKehadiran` buat akurat — depend ke C3 biar gak selalu nampilin `BELUM_CHECKIN`. | `DONE`  |
| F4  | `GET /dashboard/attendance?tanggal=`                              | Butuh `SupervisorSite` (A4, `DONE`) buat scoping, DAN `LogKehadiran` buat status real-time — depend ke C3.                                         | `READY` |
| F5  | `GET /dashboard/unfilled-shifts?tanggal=`                         | Sama kayak F4, "belum ter-cover T+15" butuh data check-in real — depend ke C3.                                                                     | `READY` |
| F6  | `GET /attendance/summary`, `GET /attendance/attempts` (HR)        | Butuh `LogKehadiran`/`PercobaanAbsensi` beneran ada isinya — depend ke C3.                                                                         | `READY` |
| F7  | `GET /reports/export?format=pdf\|xlsx`                            | Butuh data dari F6 buat digenerate — depend ke C3 (tidak langsung, lewat F6).                                                                      | `READY` |

---

## Track G — Aksi Manual HR (independen penuh)

| #   | Task                                          | Kenapa urutan segini                                                                                                                         | Status  |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| G1  | `POST /employees/:id/reset-face-registration` | Cuma nge-reset `faceEmbedding` jadi array kosong — TIDAK manggil Python microservice sama sekali, jadi TIDAK depend ke C1 (beda dari C2/C3). | `READY` |
