# Technical Design Document — Aplikasi Absensi Karyawan Outsourcing

> Dokumen ini adalah kelanjutan teknis dari `PRD-aplikasi-absensi.md`. Fokusnya _bagaimana_ sistem dibangun, bukan _mengapa_ fitur ada (itu ada di PRD). Detail kode lengkap ada di file terpisah (`schema.prisma`, `API-Contract.md`) — dokumen ini merangkai keduanya jadi satu narasi teknis, tidak menduplikasi isi mentahnya.

---

## 1. Ringkasan Stack

| Layer               | Pilihan                        | Alasan Singkat                                                                                                                                                                    |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile              | React Native                   | Satu codebase, role-based UI untuk 3 aktor — lebih fleksibel & umum dibanding split platform                                                                                      |
| Backend             | NestJS                         | TypeScript (konsisten dgn mobile), struktur modular — sekaligus jadi kesempatan belajar stack baru                                                                                |
| ORM                 | Prisma                         | Native support Postgres array (`Float[]`) untuk embedding wajah, tanpa workaround                                                                                                 |
| Database            | PostgreSQL                     | Tanpa PostGIS — kebutuhan geofencing kita cuma perbandingan 1 titik ke 1 titik (Haversine), bukan spatial search, jadi PostGIS gak kepakai kekuatannya                            |
| Face processing     | Python microservice + DeepFace | Stateless — cuma 1 endpoint (`/internal/embed`): foto masuk, embedding + liveness keluar. Perbandingan (cosine similarity + threshold) dilakukan di NestJS, bukan di microservice |
| Email transactional | Resend                         | Free tier 3.000 email/bulan, cukup untuk skala project — dipakai untuk flow reset password self-service                                                                           |

---

## 2. Arsitektur Sistem

**4 komponen inti**, komunikasi searah dari mobile ke backend, lalu backend bercabang ke 2 layanan pendukung:

```
Mobile app (React Native)
        │  REST API
        ▼
Backend API (NestJS + Prisma)
        │                    │
        ▼                    ▼
  PostgreSQL          Face verification
  (single source        (Python + DeepFace,
   of truth)              stateless)
```

**Alur check-in (paling representatif untuk memahami arsitektur ini):**

1. Mobile kirim foto + GPS + `jadwalId` ke `POST /attendance/check-in`
2. NestJS cek jendela waktu & hitung jarak GPS (Haversine) terhadap koordinat site dari jadwal aktif
3. NestJS kirim foto ke microservice Python (`POST /internal/embed`) → dapat embedding baru + hasil liveness
4. NestJS bandingkan embedding baru vs `User.faceEmbedding` tersimpan (cosine similarity di kode TypeScript sendiri)
5. Kalau semua lolos → simpan ke `LogKehadiran`; kalau gagal di titik manapun → dicatat juga ke `PercobaanAbsensi` dengan alasan spesifik

**Keputusan desain yang mendasari alur ini:**

- **Microservice stateless** — face embedding disimpan di PostgreSQL (lewat Prisma), bukan di storage terpisah milik microservice. Ini menghindari dua sumber data karyawan yang berpotensi tidak sinkron — prinsip yang sama dengan alasan `JadwalShift` jadi satu-satunya sumber penempatan (lihat §3).
- **Cron job internal** (bukan service terpisah) menjalankan 2 hal: reminder ke karyawan (T+5 menit belum check-in) dan eskalasi ke supervisor (T+15 menit), plus auto-menandai `TIDAK_HADIR` kalau sampai `jamSelesai` tidak ada percobaan check-in sama sekali.

---

## 3. ERD — Ringkasan Keputusan Desain

Skema lengkap ada di `schema.prisma`. Poin desain yang perlu dipahami (bukan sekadar dibaca dari kode):

1. **`User` satu tabel untuk 3 aktor** — dibedakan lewat kolom `role`. Menghindari duplikasi logic auth untuk 3 tabel terpisah.
2. **`JadwalShift` adalah satu-satunya sumber penempatan harian** — sengaja tidak ada tabel "assignment" statis terpisah, supaya tidak ada 2 sumber data yang bisa tidak sinkron (akar masalah PP1 di PRD).
3. **`LogKehadiran` unique ke `jadwalId`** (relasi 1:1) — secara struktur database, tidak mungkin ada catatan kehadiran tanpa jadwal aktif.
4. **`LogKehadiran` vs `PercobaanAbsensi` — dua tujuan berbeda:** `LogKehadiran` menyimpan **hasil akhir** (state terkini per shift), sedangkan `PercobaanAbsensi` mencatat **setiap percobaan** check-in/out, baik gagal maupun berhasil. Pemisahan ini penting karena satu karyawan bisa gagal check-in beberapa kali (salah lokasi, wajah tidak cocok) sebelum akhirnya berhasil — `LogKehadiran` yang unique tidak bisa menyimpan histori itu, jadi `PercobaanAbsensi` yang menanggung fungsi audit trail. Ini langsung menjawab pain point HR yang "tidak punya bukti konkret untuk verifikasi klaim" di as-is process.
5. **`HasilVerifikasi` enum** membedakan 5 kondisi spesifik (`VALID`, `GAGAL_LOKASI`, `GAGAL_WAJAH`, `GAGAL_LIVENESS`, `DI_LUAR_JENDELA_WAKTU`, `TIDAK_HADIR`) — bukan sekadar boolean sukses/gagal, supaya setiap kegagalan punya alasan yang bisa ditelusuri.
6. **Checkout kini simetris dengan check-in** — `LogKehadiran` punya koordinat & hasil verifikasi terpisah untuk check-in dan check-out (`hasilVerifikasiCheckIn` vs `hasilVerifikasiCheckOut`), bukan satu field digabung.
7. **Reset password self-service** — `User` punya `resetToken` & `resetTokenExpiry`, bukan lagi mekanisme reset manual oleh HR.
8. **`PengajuanIzin` pakai rentang tanggal** (`tanggalMulai`/`tanggalSelesai`) dan `jenis` bertipe enum (`JenisIzin`: `SAKIT`/`IZIN`/`CUTI`, bukan `String` bebas) — validasi ketat di level tipe data, bukan sekadar konvensi penamaan. Cuti/sakit multi-hari jadi 1 request, bukan berkali-kali submit per hari. Field `dokumenPendukungUrl` opsional untuk semua jenis, tapi **wajib divalidasi di API layer** (bukan constraint database) khusus `jenis=SAKIT` dengan durasi >1 hari — sesuai Pasal 93 UU Ketenagakerjaan soal syarat surat dokter untuk hak upah saat sakit.
9. **Ganti password & reset registrasi wajah — tidak butuh perubahan schema.** Keduanya reuse field yang sudah ada (`passwordHash`, `faceEmbedding`), murni logic tambahan di layer API — sinyal bahwa desain awal cukup fleksibel menampung kebutuhan susulan tanpa migrasi skema.
10. **Empat gap ditemukan saat cross-check API Contract vs schema, sudah dikoreksi:**
    - `Notifikasi` jadi tabel tersendiri — cron job & `GET /notifications` sebelumnya tidak punya sumber data sama sekali.
    - `User.statusAktif` — mencegah karyawan resign/di-PHK tetap bisa login/check-in (relevan khusus industri outsourcing dengan turnover tinggi).
    - `StatusIzin` tambah `CANCELLED` — karyawan bisa batalkan pengajuan sendiri selama masih `PENDING`, tanpa hard-delete (jaga histori).
    - `Site.statusAktif` — `DELETE /sites/:id` di API Contract sebelumnya bilang "nonaktifkan site" tapi field pendukungnya belum ada; hard delete juga akan gagal kena FK constraint begitu site sudah pernah dipakai `JadwalShift`. Mirror pola `User.statusAktif` — `DELETE` di level API sebenarnya `PATCH` under the hood.
11. **`SupervisorSite` dapat endpoint CRUD sendiri** (`/supervisor-sites`), bukan field tersembunyi di `/employees` — assignment bisa dipicu dari 2 arah (supervisor baru direkrut, ATAU site baru ditempel ke supervisor yang sudah ada) dan sifatnya bisa berubah (rotasi coverage), bukan konstanta yang cukup di-seed sekali.

---

## 4. API Contract — Ringkasan Struktur

Detail lengkap ada di `API-Contract.md`. Struktur garis besar:

| Grup                       | Jumlah Endpoint Inti | Contoh                                                          |
| -------------------------- | -------------------- | --------------------------------------------------------------- |
| Auth                       | 5                    | `POST /auth/login`, `POST /auth/change-password`                |
| Karyawan Lapangan          | 8                    | `POST /attendance/check-in`, `PATCH /leave-requests/:id/cancel` |
| Supervisor                 | 12                   | `PATCH /schedules/:id`, `GET /supervisor-sites`                 |
| HR/Admin                   | 15                   | `POST /supervisor-sites`, `PATCH /sites/:id`                    |
| Internal (NestJS ↔ Python) | 1                    | `POST /internal/embed`                                          |

**Konvensi kunci:**

- Path REST pakai bahasa Inggris, plural noun (`/schedules`, `/leave-requests`) — konvensi universal, terlepas dari bahasa field JSON di dalamnya (tetap Bahasa Indonesia, mengikuti istilah domain bisnis).
- Response envelope standar menyertakan `requestId` — penting khusus di arsitektur 2-service ini (NestJS ↔ microservice Python), memudahkan telusur log lintas service saat debugging.
- **Jendela waktu ditegakkan secara eksplisit**: check-in valid 30 menit sebelum `jamMulai` s/d `jamSelesai`; check-out valid sampai `jamSelesai + 4 jam`. Di luar itu ditolak — bukan diterima lalu diproses manual, supaya data kehadiran benar-benar mencerminkan kehadiran real-time, bukan klaim yang bisa diatur ulang kapan saja.

---

## 5. Yang Sengaja Tidak Dibangun (Scope Boundary)

Konsisten dengan prinsip "hindari kompleksitas yang tidak dijustifikasi requirement", beberapa hal sengaja di luar MVP:

- **Refresh token** — sesi JWT dengan expiry wajar (bukan token jangka pendek + refresh flow) sudah cukup untuk skala ini.
- **Riwayat perubahan status izin berkali-kali** — satu row `PengajuanIzin` per pengajuan sudah cukup; audit trail granular per perubahan status dianggap di luar scope MVP.
- **Spatial search multi-titik (PostGIS)** — kebutuhan kita cuma perbandingan 1 titik ke 1 titik, Haversine di kode aplikasi sudah cukup.
- **Offline-first** — sistem mengasumsikan koneksi internet stabil saat check-in/out; ini diakui sebagai keterbatasan yang disengaja, bukan kelalaian.
- **Validasi saldo/kuota cuti tahunan otomatis** — approval cuti tetap murni manual oleh supervisor tanpa sistem mengecek sisa kuota; ditunda ke pengembangan lanjutan.
- **Registrasi ulang wajah self-service (dengan approval HR)** — dipertimbangkan (Opsi A) tapi ditolak: kejadian jarang (ganti kacamata/jenggot bukan kejadian harian) namun risiko fraud identitas tinggi kalau dibuka self-service. Dipilih pendekatan lebih ketat (Opsi B — reset hanya oleh HR dari panel admin, karyawan registrasi ulang otomatis di login berikutnya).
