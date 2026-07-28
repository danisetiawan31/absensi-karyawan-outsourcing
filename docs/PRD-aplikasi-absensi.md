# PRD — Aplikasi Absensi Karyawan Outsourcing (Security & Cleaning Service)

> **Status:** Draft v2 — hasil discovery phase, telah diupdate menyusul keputusan platform & arsitektur teknis. Detail teknis (stack, ERD, API contract) didokumentasikan terpisah di Technical Design Document, tidak diduplikasi di sini.
> **Konteks:** Studi kasus fiktif untuk keperluan portfolio. Perusahaan, nama, dan skenario operasional bersifat rekaan, namun disusun berdasarkan pola masalah nyata yang terdokumentasi di industri outsourcing tenaga kerja (security & cleaning service) di Indonesia.

---

## 1. Latar Belakang & Problem Statement

Perusahaan outsourcing security & cleaning service menempatkan tenaga kerja di berbagai lokasi klien (site) yang tersebar, bekerja dalam sistem shift. Model bisnis ini menciptakan tantangan operasional yang tidak dialami perusahaan dengan lokasi kerja tunggal/tetap.

**Rumusan masalah utama:**

> Perusahaan outsourcing tidak memiliki satu sumber kebenaran (*single source of truth*) yang real-time untuk dua hal yang saling terkait: **(a)** jadwal kerja yang seharusnya berlaku — termasuk perubahannya akibat izin/sakit/permintaan klien, dan **(b)** kehadiran aktual dibanding jadwal tersebut, di lokasi klien yang tersebar.

Masalah ini berdampak ganda: secara internal (payroll tidak akurat, potensi fraud/buddy punching), dan secara eksternal (kepercayaan klien terhadap kualitas layanan, karena perusahaan outsourcing menagih klien berdasarkan jam kerja staf yang ditempatkan).

---

## 2. Profil Perusahaan Fiktif

| Atribut | Deskripsi |
|---|---|
| Nama fiktif | PT (nama fiktif, TBD) |
| Industri | Outsourcing tenaga kerja — security & cleaning service |
| Lokasi | Jakarta |
| Skala | 50+ karyawan lapangan, tersebar di beberapa site/lokasi klien |
| Model kerja | Shift (pagi/siang/malam), penempatan per site, dapat berubah sesuai kontrak klien |

---

## 3. Aktor & Peran

| Aktor | Deskripsi Peran |
|---|---|
| **Karyawan Lapangan** | Satpam/cleaner, ditugaskan ke site klien sesuai jadwal shift |
| **Supervisor / Koordinator Lapangan** | Membuat jadwal, approve izin, memantau kehadiran real-time di site yang menjadi tanggung jawabnya |
| **HR / Admin Pusat** | Kelola data master karyawan, rekap kehadiran, laporan payroll & pelaporan ke klien |

---

## 4. As-Is Process & Pain Point

### Ringkasan Kondisi Saat Ini (As-Is)
Jadwal dikomunikasikan lewat chat informal dan rawan berubah tanpa sumber pasti. Pencatatan kehadiran berbeda-beda tiap site (buku manual, spreadsheet, WhatsApp, sistem klien). Supervisor baru mengetahui ketidakhadiran setelah masalah terjadi (blind spot 1–1.5 jam sejak shift dimulai). HR harus merekonsiliasi data dari banyak sumber yang kerap tidak sinkron.

### Pain Point (PP)

| ID | Pain Point |
|---|---|
| **PP1** | Jadwal tidak reliable sebagai rujukan — info jadwal & perubahannya (izin, sakit, permintaan klien) tersebar di chat informal |
| **PP2** | Kehadiran sulit diverifikasi terhadap jadwal — siapa, kapan, di lokasi mana, apakah benar orang tersebut yang check-in |
| **PP3** | Deviasi (ketidakhadiran) baru diketahui setelah masalah terjadi, bukan saat mulai terjadi |
| **PP4** | Tindakan korektif lambat — tidak ada sinyal otomatis yang menunjukkan "shift ini belum terisi" |

---

## 5. Functional Requirements

*Notasi PPx merujuk ke pain point yang dijawab oleh requirement tersebut.*

**Lintas Aktor** (berlaku ke Karyawan, Supervisor, HR/Admin sekaligus):
- Mengganti password sendiri (self-service, verifikasi pakai password lama) — *keamanan dasar, bukan fitur opsional*

### 5.1 Karyawan Lapangan
- Melihat jadwal shift & lokasi penugasan yang berlaku saat ini — *PP1*
- Melihat notifikasi in-app bila ada perubahan jadwal — *PP1*
- Mengajukan izin/sakit/cuti (dengan rentang tanggal) melalui sistem, dapat melihat status approval — *PP1*
- Melampirkan dokumen pendukung (mis. surat dokter) — wajib untuk sakit >1 hari, opsional untuk jenis lain — *PP1, sesuai Pasal 93 UU Ketenagakerjaan*
- Membatalkan pengajuan izin sendiri, selama status masih menunggu approval — *PP1*
- Menerima reminder in-app bila belum check-in melewati T+5 menit dari jam shift mulai (self-correct sebelum eskalasi ke supervisor) — *PP3*
- Melakukan check-in/check-out dengan **face verification (1:1)** + capture lokasi GPS saat itu — *PP2*
- Sistem menolak check-in bila lokasi berada di luar radius toleransi site yang ditugaskan — *PP2*

### 5.2 Supervisor / Koordinator Lapangan
- Membuat & mempublikasikan jadwal shift per site (input manual per karyawan) — *PP1*
- Approve/reject pengajuan izin, dengan visibility karyawan yang tersedia sebagai pengganti — *PP1*
- Dashboard real-time status kehadiran seluruh site yang disupervisi (hadir/belum/terlambat) — *PP2, PP3*
- Menerima alert otomatis (cron-based) bila karyawan belum check-in melewati T+15 menit dari jam shift mulai (eskalasi setelah reminder ke karyawan tidak direspons) — *PP3, PP4*
- Melihat daftar "shift belum terisi" untuk tindakan cari pengganti — *PP4*
- Melihat daftar site yang menjadi tanggung jawabnya di halaman profil (read-only, assignment diatur HR) — *fondasi profil*

### 5.3 HR / Admin
- Kelola data master karyawan & riwayat penempatan site — *fondasi*
- Mengelola assignment supervisor ke site yang diawasi — dapat berubah sewaktu-waktu (rotasi coverage, kontrak klien berakhir), bukan ditentukan sekali di awal — *fondasi*
- Menonaktifkan akun karyawan yang resign/di-PHK (mencegah login/check-in setelah tidak aktif) — *integritas data*
- Melihat rekap kehadiran terkonsolidasi dari satu sumber data — *PP2*
- Generate laporan kehadiran per periode (export PDF/Excel) untuk payroll & pelaporan ke klien — *turunan PP2*
- Melihat histori approval izin (audit trail) — *PP1*
- Reset registrasi wajah karyawan (memicu registrasi ulang di login berikutnya) — *keamanan biometrik, cegah celah fraud identitas kalau dibuat self-service*

---

## 6. Non-Functional Requirements

| Area | Requirement | Catatan Skala |
|---|---|---|
| **Keamanan data biometrik** | Simpan **face embedding**, bukan foto mentah. Consent checkbox saat onboarding. Retention data lokasi 3–6 bulan lalu di-purge. | Level defensible untuk portfolio, bukan level compliance enterprise |
| **Reliability alert** | Cron job sederhana (cek berkala, misal tiap 5 menit) + logging bila gagal jalan | Tidak perlu job queue terdistribusi |
| **Toleransi GPS** | Radius geofence longgar (50–100m) untuk akomodasi drift GPS indoor (basement/gudang) | Tidak perlu fallback Wi-Fi triangulation |
| **Beban concurrent** | Backend standar cukup untuk skala 50+ karyawan (stack final: lihat Technical Design Document) | Tidak perlu load balancer/horizontal scaling |
| **Konektivitas** | **Online-only** — diakui sebagai known limitation di laporan | Offline-first didorong ke fitur lanjutan (tidak dibangun) |

---

## 7. Scope: MVP vs Fitur Lanjutan

### Karyawan Lapangan
| MVP | Fitur Lanjutan |
|---|---|
| Lihat jadwal shift & lokasi penugasan | Push notification (FCM) untuk perubahan jadwal |
| Reminder in-app T+5 menit belum check-in | — |
| Check-in/out: face verification + GPS | — |
| Ajukan izin/sakit/cuti (rentang tanggal) + upload dokumen + lihat status | — |

### Supervisor / Koordinator Lapangan
| MVP | Fitur Lanjutan |
|---|---|
| Buat & publish jadwal shift (manual) | Auto-suggest pengganti berbasis algoritma availability |
| Approve/reject izin | Shift-swap self-service antar karyawan |
| Dashboard real-time status kehadiran | — |
| Alert otomatis belum check-in (T+15 menit) | — |
| Daftar shift belum terisi | — |
| Lihat site yang diawasi (profil) | — |

### HR / Admin
| MVP | Fitur Lanjutan |
|---|---|
| Kelola data master karyawan & site | Integrasi otomatis ke sistem payroll eksternal (API) |
| Rekap kehadiran terkonsolidasi | Analytics dashboard (tren kehadiran per periode) |
| Generate laporan (export PDF/Excel) | — |
| Audit trail approval izin | Validasi otomatis saldo/kuota cuti tahunan (saat ini approval cuti murni manual oleh supervisor) |
| Reset registrasi wajah karyawan | — |

### Cross-cutting
- Role-based access (3 role) → **MVP**, fondasi wajib
- Ganti password sendiri (semua role) → **MVP**, fondasi keamanan dasar
- Multi-tenant (banyak perusahaan) → **tidak relevan**, skenario single-company

---

## 8. Konsep Data Model (Level Konseptual)

| Entitas | Deskripsi Singkat |
|---|---|
| **Site** | Master lokasi klien: nama, alamat, koordinat, radius toleransi geofence |
| **Karyawan** | Data pribadi karyawan + face embedding |
| **Jadwal Shift** | karyawan_id, site_id, tanggal, jam_mulai, jam_selesai — **sumber kebenaran** untuk penempatan harian & rujukan verifikasi GPS |
| **Supervisor-Site** | Mapping supervisor_id ↔ site_id (many-to-many) — menentukan cakupan dashboard monitoring tiap supervisor |
| **Pengajuan Izin** | karyawan_id, tanggal_mulai, tanggal_selesai, jenis, dokumen_pendukung (opsional, wajib utk sakit >1 hari), status approval, approved_by |
| **Log Kehadiran** | karyawan_id, jadwal_id, timestamp check-in/out, koordinat GPS, hasil face verification |

**Catatan desain penting:** penempatan karyawan ke site **tidak** disimpan sebagai tabel assignment statis terpisah, melainkan melekat pada Jadwal Shift — supaya tidak ada dua sumber data yang berpotensi tidak sinkron (kembali ke prinsip single source of truth di PP1).

---

## 9. Yang Belum Diputuskan (Ditindaklanjuti di Technical Design Document)

- Platform mobile (React Native / Flutter / Native)
- Arsitektur backend & pemilihan stack (bahasa, framework, database)
- Library/SDK spesifik untuk face recognition & liveness detection
- Skema API & kontrak data antar service
- ERD detail (tipe data, relasi FK, index)
