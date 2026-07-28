---
name: Absensi Outsourcing — Flat Utility Yellow
platform: React Native (mobile only)
mode: Light only
version: 2 — hasil iterasi mockup Stitch (Beranda, Absensi 3-state, Izin)
colors:
  primary: "#FFC81E"
  on-primary: "#1E1B16"
  primary-soft-bg: "#FFF9E8"
  primary-soft-fg: "#765A00"
  background: "#FAFAF8"
  surface: "#FFFFFF"
  foreground: "#1E1B16"
  muted: "#64748B"
  muted-bg: "#F1F1EF"
  border: "#E4E4DF"
  success: "#16A34A"
  success-bg: "#DCFCE7"
  warning: "#EA580C"
  warning-bg: "#FFF1E8"
  info: "#2563EB"
  destructive: "#DC2626"
  destructive-bg: "#FEE2E2"
typography:
  family: Plus Jakarta Sans
  body-md:
    fontSize: 16px
    fontWeight: 400
  label-sm:
    fontSize: 12px
    fontWeight: 600
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  full: 999px
---

# Design System — Aplikasi Absensi Karyawan Outsourcing

## Overview

Flat Design, light mode saja, satu warna aksen kuning (`#FFC81E`) yang punya **3 tingkat pemakaian** (solid / soft / netral — lihat §Icon Chip) supaya kuning tetap terasa bermakna, tidak jadi warna default yang ditempel ke mana-mana. Sistem ini sudah melewati beberapa putaran review mockup Stitch untuk role Karyawan Lapangan; beberapa aturan di versi 1 sudah direvisi berdasarkan hasil review tersebut — dicatat di bawah supaya gak ada keputusan yang "hilang".

Prinsip inti (revisi):
- **Kuning solid = elemen interaktif saja.** Header/brand chrome, CTA utama, tombol Absensi elevated, indikator tab aktif. Bukan buat elemen dekoratif.
- **Kuning soft = penanda dekoratif bermerek**, dipakai kalau kuning solid terasa terlalu "berat"/bersaing dengan CTA asli di layar yang sama.
- **Warna = makna.** Tiap warna status memetakan ke enum backend (`HasilVerifikasi`, status dashboard, `StatusIzin`) — tidak ada warna bebas pakai di luar sistem ini.
- **Layar navigasi vs layar terminal beda perlakuan header** — lihat §Top Bar & Header.

---

## Warna

### Warna Dasar & Level Kuning
| Token | Hex | Pemakaian |
|---|---|---|
| `primary` (solid) | bg `#FFC81E` / fg `#1E1B16` | Header, CTA utama (1 per layar), tombol Absensi elevated, tab aktif |
| `primary-soft` | bg `#FFF9E8` / fg `#765A00` | Icon chip dekoratif non-interaktif saat kuning solid terlalu bersaing dengan CTA di layar yang sama (kontras 6.18:1, lolos AA) |
| `background` | `#FAFAF8` | Latar layar |
| `surface` | `#FFFFFF` | Card, sheet, input |
| `foreground` | `#1E1B16` | Teks utama |
| `muted` | `#64748B` | Teks sekunder, label, tanggal, caption |
| `muted-bg` | `#F1F1EF` | Icon chip netral (list berulang) |
| `border` | `#E4E4DF` | Pembatas card/list |

### Icon Chip — 3 Tingkat (aturan hasil revisi, penting)
Ini sempat bolak-balik selama review, jadi didokumentasikan jelas supaya konsisten ke depan:

1. **Solid** (bg `primary`, icon `on-primary` hitam) — HANYA untuk elemen benar-benar interaktif: tombol, header, tab aktif. Jangan dipakai untuk icon chip deskriptif.
2. **Soft** (bg `primary-soft-bg`, icon `primary-soft-fg`) — untuk icon chip statis/deskriptif dalam jumlah sedikit (2-4) di satu layar ringkasan, misal icon "Lokasi", "Shift", "Informasi" di layar Check-in Berhasil. Ini pilihan final — sebelumnya sempat dicoba solid kuning+hitam, tapi terasa bersaing dengan tombol CTA asli di layar yang sama.
3. **Netral** (bg `muted-bg`, icon `foreground` gelap) — untuk icon chip dalam **list berulang** (5+ item, misal Riwayat Izin) atau grid aksi majemuk (misal "Aksi Cepat" di Beranda: Riwayat/Izin/Bantuan). Di konteks berulang, kuning (solid maupun soft) akan terasa noise dan melemahkan CTA utama layar.

### Warna Semantik — Status Kehadiran
| Status | Token | Hex | Sumber data |
|---|---|---|---|
| Hadir / Valid | `success` | `#16A34A` | `HasilVerifikasi.VALID`, dashboard `HADIR` |
| Terlambat | `warning` | `#EA580C` | dashboard `TERLAMBAT` — **bukan kuning**, sengaja beda dari `primary` biar gak bentrok makna |
| Izin | `info` | `#2563EB` | dashboard `IZIN` — dipakai sebagai label status saja, bukan aksen UI berulang |
| Belum check-in | `muted` | `#64748B` | dashboard `BELUM` |
| Tidak hadir | `destructive` | `#DC2626` | `HasilVerifikasi.TIDAK_HADIR`, dashboard `TIDAK_HADIR` |
| Gagal verifikasi (4 jenis) | `destructive` + ikon/teks beda per jenis | `#DC2626` | `GAGAL_LOKASI`, `GAGAL_WAJAH`, `GAGAL_LIVENESS`, `DI_LUAR_JENDELA_WAKTU` — dibedakan lewat ikon+label, bukan hue berbeda |

### Warna Semantik — StatusIzin
| Status | Token | Pemakaian |
|---|---|---|
| PENDING | `muted` (bg `#F1F5F9`) | "Menunggu" — netral, belum ada keputusan |
| APPROVED | `success` (bg `success-bg`) | "Disetujui" |
| REJECTED | `destructive` (bg `destructive-bg`) | "Ditolak" |

### Chip Status Dinamis (khusus layar Capturing/Verifikasi)
Chip jarak GPS ("42m dari [nama site]") berubah warna sesuai kondisi real-time — hijau (dalam radius toleransi), oranye/merah (mendekati/di luar radius). Chip ini TIDAK boleh netral statis — fungsinya sebagai sinyal langsung ke karyawan.

### Left-Accent-Stripe (pola untuk list card)
Untuk card dalam list yang punya status (misal Riwayat Izin), tambahkan border kiri 4px berwarna sesuai status (`success`/`warning`/`destructive`/`muted`). Ini teknik yang sama dengan strip kuning di card greeting Beranda — dipakai untuk memberi "napas visual" pada list yang berulang, sekaligus scan-ability cepat tanpa harus baca badge satu-satu.

---

## Tipografi
**Plus Jakarta Sans**, single family — alasan sudah settled sejak awal (bundle RN ringan, dynamic-type aware).

| Level | Size | Weight | Pemakaian |
|---|---|---|---|
| Display | 28px | 800 | Judul layar utama (jarang dipakai) |
| Heading | 20-24px | 700 | Elemen hero (timestamp check-in, alasan gagal) |
| Title | 16px | 600 | Judul card |
| Body | 16px | 400, line-height 1.5 | Teks utama |
| Label | 12px | 600, uppercase | Label field/section — **selalu abu `muted`, jangan biru** (lihat §Bug Berulang) |
| Caption | 13px | 400, `muted` | Metadata sekunder |

**Prinsip hero-info:** info paling dicari cepat oleh user (jam shift, timestamp check-in, alasan gagal verifikasi) harus jadi elemen tipografi paling dominan di layarnya — bukan caption kecil yang gampang kelewat.

---

## Spacing, Radius & Elevation
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48px.
- **Card padding: 18-20px** (dinaikkan dari 16px setelah review Riwayat Izin terasa terlalu sesak), jarak antar card 12-14px.
- Radius: `sm` 6px (chip/badge), `md` 8px (card/input/tombol), `lg` 12px (sheet/modal), `full` (tombol Absensi elevated, avatar).
- Tanpa shadow — pemisahan visual pakai `border` 1px + kontras `surface` vs `background`.

---

## Komponen Kunci

### Top Bar & Header — aturan per jenis layar
| Jenis layar | Header | Elemen kanan |
|---|---|---|
| Root tab (Beranda, Izin, Notifikasi, dst) | Solid kuning full-width | Avatar profil bulat |
| Sub-halaman (di-push dari list, misal form Ajukan Izin) | Solid kuning full-width | Back arrow di kiri, tanpa avatar |
| Layar terminal/konfirmasi (Check-in Berhasil, Verifikasi Gagal) | **Tanpa header** | — |

**Kenapa layar terminal sengaja tanpa header:** ini bukan inkonsistensi, tapi sinyal yang disengaja. Layar navigasi butuh orientasi "saya di mana, gimana balik" — layar terminal justru sebaliknya, ini momen final yang tidak bisa dibatalkan/diulang, jadi lepas dari pola navigasi biasa.

### Tombol
- **Primary CTA**: fill `primary` kuning solid, teks/icon `on-primary` gelap, radius `md`, tinggi min 48px. Dipakai konsisten sebagai warna CTA utama **terlepas dari status hasil aksi** (baik untuk aksi yang belum selesai seperti "Ambil Foto & Check-in", maupun konfirmasi setelah berhasil seperti "Kembali ke Beranda") — direvisi dari aturan v1 yang membedakan warna CTA berdasar status; warna gelap solid dirasa mengganggu di layar bernuansa cerah seperti Check-in Berhasil.
- **Secondary button**: outline 1px `border` abu (bukan outline kuning), teks `foreground`.
- **Pill selector** (misal Jenis Izin): state aktif = fill `primary` + teks `on-primary`; state tidak aktif = outline abu + teks `muted`.
- Semua tombol: touch target minimum 44×44px.

### Status Badge
Pill kecil (`radius: sm`), background soft dari warna semantik (`success-bg`/`warning-bg`/`destructive-bg`/abu muda) + teks warna solidnya + ikon kecil di kiri. Selalu teks+ikon, jangan cuma warna polos.

### Card
`surface` putih di atas `background`, border 1px, radius `md`, padding 18-20px, tanpa shadow.

### Bottom Navigation
Max 4-5 item, avatar TIDAK masuk sini (lihat Top Bar). Ikon SVG outline, state aktif = warna `primary` untuk ikon+label+underline.

---

## Navigasi per Role

### Karyawan Lapangan (4 item, 1 elevated)
`Beranda` · `Izin` · **`Absensi`** (center, elevated, solid kuning) · `Notifikasi`

### Supervisor / Koordinator (4 item)
`Dashboard` · `Jadwal` · `Izin` · `Notifikasi`

### HR / Admin (5 item)
`Kehadiran` (tab Rekap + Audit Trail) · `Karyawan` · `Izin` · `Laporan` · `Site`

*(Struktur navigasi 3 role ini belum berubah dari kesepakatan awal — belum diuji lewat mockup untuk Supervisor & HR.)*

---

## Layar Kritis — Flow Absensi (sudah diuji lewat mockup)

1. **Capturing** — preview kamera fullscreen, frame guide wajah, chip jarak GPS dengan warna dinamis (lihat §Chip Status Dinamis). Header solid kuning (root dari tab Absensi).
2. **Verifying** — state loading singkat, tidak dibahas detail di mockup, minimal ada indikator progress.
3. **Berhasil** — tanpa header. Checkmark hijau besar → timestamp sebagai elemen hero (bold besar, bukan caption) → card ringkasan lokasi & shift (icon chip **soft**) → CTA kuning solid "Kembali ke Beranda" → link sekunder "Lihat riwayat absensi".
4. **Gagal** — tanpa header. Icon X merah besar → alasan gagal sebagai hero (bold merah) → card detail (jarak/alasan spesifik) → card lokasi kerja (icon chip soft) → CTA kuning solid "Coba Lagi" + secondary outline "Hubungi Bantuan". 4 varian alasan (`GAGAL_LOKASI/WAJAH/LIVENESS`, `DI_LUAR_JENDELA_WAKTU`) beda di teks+ikon saja, bukan struktur layar.

## Layar Kritis — Izin (sudah diuji lewat mockup)
- **List/riwayat**: card dengan left-accent-stripe sesuai `StatusIzin`, icon chip **netral** (karena berulang), label tanggal abu (bukan biru).
- **Form pengajuan**: minim dekorasi, hierarki label jelas (uppercase abu + input di bawah), pill selector jenis izin, tombol submit kuning solid sticky di bawah.
- ⚠️ **Catatan terbuka, belum final**: field tanggal di form harus **rentang** (Tanggal Mulai + Tanggal Selesai), sesuai `schema.prisma`/`API-Contract.md` (`tanggalMulai`/`tanggalSelesai`) — brief awal sempat salah cuma kasih 1 field, belum direvisi ke Stitch. Soal "upload dokumen wajib untuk semua jenis izin" masih **belum dikonfirmasi** — dokumen project saat ini (PRD/API-Contract/TDD) masih menyatakan opsional kecuali `sakit` >1 hari; kalau mau diubah, perlu update dokumen tsb juga, bukan cuma mockup.

---

## Bug Berulang yang Harus Diwaspadai
Beberapa kali Stitch menghasilkan warna di luar sistem — waspadai ini setiap review mockup baru:
- **Teks biru default** (link-color bawaan Stitch) muncul di label/tanggal/greeting yang seharusnya abu netral `muted`.
- **Badge/icon warna tan-cream improvisasi** yang bukan `primary-soft` resmi kita.
- **Warna oranye/kuning tertukar** antara `primary` dan `warning` — cek selalu label mana yang statusnya TERLAMBAT (harus `warning` oranye, bukan kuning).

---

## Do's and Don'ts
- ✅ Kuning solid cuma untuk elemen interaktif (header, CTA, tab aktif, tombol Absensi).
- ✅ Icon chip ikuti 3 tingkat (solid/soft/netral) sesuai konteks — lihat tabel di §Icon Chip.
- ✅ CTA kuning solid dipakai konsisten baik untuk aksi belum selesai maupun konfirmasi setelah berhasil.
- ✅ Layar terminal/konfirmasi sengaja tanpa header.
- ✅ Setiap indikator status wajib punya teks/ikon pendamping, tidak cuma warna.
- ✅ Info paling penting per layar (jam, timestamp, alasan gagal) jadi elemen tipografi paling dominan.
- ❌ Jangan pakai `primary` untuk menandai status apapun (khususnya jangan disamakan dengan `warning`).
- ❌ Jangan pakai icon chip kuning (solid maupun soft) di list berulang — pakai netral.
- ❌ Jangan biarkan warna biru/tan improvisasi Stitch lolos ke kode — selalu dikoreksi balik ke token resmi.
- ❌ Jangan tambah shadow/gradient.
- ❌ Jangan turunkan body text di bawah 16px untuk konten yang dibaca.
- ❌ Jangan bikin dark mode varian — scope MVP light mode saja.
