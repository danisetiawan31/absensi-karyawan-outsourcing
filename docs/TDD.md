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
9. **Ganti password rutin & reset registrasi wajah tidak butuh perubahan schema di luar yang sudah ada** — keduanya reuse field yang sudah ada (`passwordHash`, `faceEmbedding`), murni logic tambahan di layer API. **Pengecualian: password untuk akun BARU** (initial provisioning oleh HR) butuh 1 field tambahan (`wajibGantiPassword`) — ini bukan reuse, tapi kebutuhan baru yang muncul dari keputusan strategi provisioning; lihat poin 13.
10. **Empat gap ditemukan saat cross-check API Contract vs schema, sudah dikoreksi:**
    - `Notifikasi` jadi tabel tersendiri — cron job & `GET /notifications` sebelumnya tidak punya sumber data sama sekali.
    - `User.statusAktif` — mencegah karyawan resign/di-PHK tetap bisa login/check-in (relevan khusus industri outsourcing dengan turnover tinggi).
    - `StatusIzin` tambah `CANCELLED` — karyawan bisa batalkan pengajuan sendiri selama masih `PENDING`, tanpa hard-delete (jaga histori).
    - `Site.statusAktif` — endpoint nonaktifkan site di API Contract sebelumnya bilang "nonaktifkan site" tapi field pendukungnya belum ada; hard delete juga akan gagal kena FK constraint begitu site sudah pernah dipakai `JadwalShift`. Ditambahkan sebagai field, diakses lewat `PATCH /sites/:id` — konsisten dengan pola `User.statusAktif`, lihat poin 12 untuk histori koreksinya.
11. **`SupervisorSite` dapat endpoint CRUD sendiri** (`/supervisor-sites`), bukan field tersembunyi di `/employees` — assignment bisa dipicu dari 2 arah (supervisor baru direkrut, ATAU site baru ditempel ke supervisor yang sudah ada) dan sifatnya bisa berubah (rotasi coverage), bukan konstanta yang cukup di-seed sekali.
12. **`Site` dinonaktifkan lewat `PATCH /sites/:id`, konsisten dengan pola `User`** — `statusAktif` ikut sebagai field opsional di `PATCH`, tidak ada endpoint `DELETE` terpisah. Ini koreksi dari desain awal (`DELETE /sites/:id` sempat dibangun terpisah dengan alasan "endpoint action eksplisit untuk keputusan bisnis signifikan"), yang saat ditelisik ulang ternyata argumennya lemah: (a) analogi ke API publik yang dipakai buat membelanya keliru — GitHub archive repo justru pakai `PATCH` (`{"archived": true}`), bukan `DELETE`; Stripe cancel subscription bukan analogi yang tepat karena subscription itu entitas lifecycle/proses, beda karakter dari `Site` yang entitas statis (sama persis karakternya dengan `User`); (b) dua entitas dengan konsep identik (nonaktifkan entitas, data historis tetap ada) pakai mekanisme HTTP verb berbeda itu justru inkonsistensi di permukaan API, bukan variasi yang defensible; (c) best practice REST umum (mis. Microsoft REST API Guidelines, Google API Design Guide) menyiratkan `DELETE` = resource berhenti bisa diakses lewat cara normal — kalau `GET /sites` masih menampilkan site yang di-`DELETE` (cuma `statusAktif: false`), itu menyimpang dari ekspektasi standar. Konsolidasi ini dilakukan meski `DELETE /sites/:id` sudah sempat shipped & tested — cost rework diterima karena mengikuti best practice lebih penting daripada mempertahankan keputusan yang argumennya sudah terbukti lemah begitu ditelisik ulang.
13. **Password akun baru (initial provisioning oleh HR) — sistem generate, ditampilkan sekali, wajib diganti.** Saat HR membuat karyawan baru lewat `POST /employees`, sistem generate password acak (bukan HR yang menentukan atau mengetik manual) dan mengembalikannya **satu kali saja** di response (`passwordSementara`) — tidak disimpan plaintext, tidak bisa diambil ulang. `User.wajibGantiPassword` otomatis `true`, memaksa karyawan mengganti password di login pertama lewat `POST /auth/change-password` yang sudah ada. Pendekatan ini dipilih dibanding kirim password lewat email (Resend) karena karyawan lapangan (satpam/cleaning service) tidak selalu reliable dicapai lewat email — menghindari failure mode akun "orphan" kalau email gagal terkirim atau masuk spam, tanpa mekanisme "resend invite" yang perlu dibangun terpisah. Trade-off yang diterima: HR sempat melihat password plaintext sekali (disalin lalu disampaikan manual), tapi ini dianggap wajar untuk konteks HR internal perusahaan (bukan pihak eksternal), dan risikonya dieliminasi begitu karyawan ganti password di login pertama.

---

## 4. API Contract — Ringkasan Struktur

Detail lengkap ada di `API-Contract.md`. Struktur garis besar:

| Grup                       | Jumlah Endpoint Inti | Contoh                                                                |
| -------------------------- | -------------------- | --------------------------------------------------------------------- |
| Auth                       | 5                    | `POST /auth/login`, `POST /auth/change-password`                      |
| Karyawan Lapangan          | 8                    | `POST /attendance/check-in`, `PATCH /leave-requests/:id/cancel`       |
| Supervisor                 | 12                   | `PATCH /schedules/:id`, `GET /supervisor-sites`                       |
| HR/Admin                   | 15                   | `POST /employees`, `PATCH /sites/:id`, `GET /employees/:id/schedules` |
| Internal (NestJS ↔ Python) | 1                    | `POST /internal/embed`                                                |

**Konvensi kunci:**

- Path REST pakai bahasa Inggris, plural noun (`/schedules`, `/leave-requests`) — konvensi universal, terlepas dari bahasa field JSON di dalamnya (tetap Bahasa Indonesia, mengikuti istilah domain bisnis).
- Response envelope standar menyertakan `requestId` — penting khusus di arsitektur 2-service ini (NestJS ↔ microservice Python), memudahkan telusur log lintas service saat debugging.
- **Jendela waktu ditegakkan secara eksplisit**: check-in valid 30 menit sebelum `jamMulai` s/d `jamSelesai`; check-out valid sampai `jamSelesai + 4 jam`. Di luar itu ditolak — bukan diterima lalu diproses manual, supaya data kehadiran benar-benar mencerminkan kehadiran real-time, bukan klaim yang bisa diatur ulang kapan saja.
- **Tidak ada endpoint register/self-signup** — satu-satunya jalur pembuatan user adalah `POST /employees` oleh HR (lihat poin 13 di atas), konsisten dengan model 3 aktor yang semuanya internal perusahaan, bukan user publik.

---

## 5. Yang Sengaja Tidak Dibangun (Scope Boundary)

Konsisten dengan prinsip "hindari kompleksitas yang tidak dijustifikasi requirement", beberapa hal sengaja di luar MVP:

- **Refresh token** — sesi JWT dengan expiry wajar (bukan token jangka pendek + refresh flow) sudah cukup untuk skala ini.
- **Riwayat perubahan status izin berkali-kali** — satu row `PengajuanIzin` per pengajuan sudah cukup; audit trail granular per perubahan status dianggap di luar scope MVP.
- **Spatial search multi-titik (PostGIS)** — kebutuhan kita cuma perbandingan 1 titik ke 1 titik, Haversine di kode aplikasi sudah cukup.
- **Offline-first** — sistem mengasumsikan koneksi internet stabil saat check-in/out; ini diakui sebagai keterbatasan yang disengaja, bukan kelalaian.
- **Validasi saldo/kuota cuti tahunan otomatis** — approval cuti tetap murni manual oleh supervisor tanpa sistem mengecek sisa kuota; ditunda ke pengembangan lanjutan.
- **Registrasi ulang wajah self-service (dengan approval HR)** — dipertimbangkan (Opsi A) tapi ditolak: kejadian jarang (ganti kacamata/jenggot bukan kejadian harian) namun risiko fraud identitas tinggi kalau dibuka self-service. Dipilih pendekatan lebih ketat (Opsi B — reset hanya oleh HR dari panel admin, karyawan registrasi ulang otomatis di login berikutnya).
- **Kirim password akun baru lewat email (Resend)** — dipertimbangkan saat provisioning karyawan baru, tapi ditolak karena karyawan lapangan tidak selalu reliable dicapai lewat email dan tidak ada mekanisme "resend invite" untuk menangani kegagalan kirim. Dipilih pendekatan generate + tampilkan sekali ke HR + wajib ganti di login pertama (lihat poin 13 di §3).
