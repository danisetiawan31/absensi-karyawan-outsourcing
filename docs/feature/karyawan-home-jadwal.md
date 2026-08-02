# Karyawan Home & Jadwal

## Konteks & tujuan

Landing screen pertama karyawan setelah login + face registration selesai. Menampilkan jadwal hari ini (`GET /schedules/today`) dan status kehadiran, sekaligus membangun kerangka bottom tab navigation untuk role KARYAWAN (Beranda/Izin/Absensi/Notifikasi) — tab selain Beranda untuk sekarang berupa placeholder "Segera Hadir" karena fiturnya (Track J) belum dibangun.

Referensi visual: mockup yang sudah di-share user (Beranda card kuning header + card putih), diadaptasi dengan penyesuaian berikut (BUKAN 100% identik):

- Hapus badge "Jenis Shift" (tidak ada data pendukung di schema) — diganti 2 badge status berdampingan: "Check-in" dan "Check-out", diturunkan dari `statusKehadiran`.
- Avatar foto profil diganti inisial nama (2 huruf pertama, generated dari `nama`) — tidak ada field foto di schema `User`.
- Quick Action HANYA "Izin" (placeholder) dan "Bantuan" (static content) — "Riwayat" TIDAK masuk scope (tidak ada endpoint karyawan-facing untuk riwayat pribadi di API-Contract).

## Requirement

1. **Tab navigation skeleton** untuk role KARYAWAN:
   - 4 tab: Beranda (aktif, fungsional penuh), Izin, Absensi, Notifikasi (3 terakhir: placeholder "Segera Hadir" — teks sederhana, ikon, tanpa fungsi)
   - Tombol Absensi menonjol di tengah (sesuai DESIGN.md § Bottom Navigation), tetap placeholder untuk sekarang
   - Struktur ini WAJIB tetap di dalam route group `(karyawan)` yang sudah ada, tidak boleh mengganggu gate check `wajahTerdaftar` dari face-registration-mobile

2. **Beranda screen** — data dari `GET /schedules/today`:
   - Header: sapaan "Halo, {nama}" + avatar inisial (bg warna primary/muted, teks inisial)
   - Card status hari ini: badge status kehadiran (BELUM_CHECKIN/SUDAH_CHECKIN/SELESAI — warna dari token semantik DESIGN.md: BELUM_CHECKIN = muted, SUDAH_CHECKIN = info, SELESAI = success), jam shift (jamMulai - jamSelesai), durasi kerja dihitung client-side dari selisih jam
   - Card lokasi kerja: nama site + alamat (dari `site.nama`, `site.alamat`)
   - 2 badge berdampingan "Check-in" dan "Check-out", status diturunkan dari `statusKehadiran`:
     - BELUM_CHECKIN → Check-in: belum, Check-out: belum
     - SUDAH_CHECKIN → Check-in: sudah, Check-out: belum
     - SELESAI → Check-in: sudah, Check-out: sudah
   - Quick Action: "Izin" (navigasi ke placeholder tab Izin) dan "Bantuan" (static content — FAQ singkat atau kontak HR, tidak perlu API)
   - Reminder banner (opsional, boleh disederhanakan dari mockup): jika BELUM_CHECKIN dan waktu sekarang mendekati/melewati jamMulai, tampilkan pengingat

3. **Multiple jadwal handling:** `GET /schedules/today` return array — kalau lebih dari 1 jadwal di hari yang sama (edge case jarang tapi mungkin), tampilkan sebagai list card (bukan cuma ambil index pertama dan buang sisanya)

4. **Pull-to-refresh** pada Beranda (standar UX untuk data yang bisa berubah, pakai TanStack Query refetch)

## Tahapan implementasi

- **Tahap 1 (Tab skeleton):** Bangun struktur Tabs navigator di dalam `(karyawan)` — 4 tab, 3 di antaranya placeholder "Segera Hadir" (Izin, Absensi, Notifikasi), 1 tab Beranda kosong dulu (belum fetch data)
- **Tahap 2 (Beranda — data & UI utama):** Integrasi `GET /schedules/today` (TanStack Query), render card status/shift/lokasi/badge check-in-out, handle multiple jadwal
- **Tahap 3 (Empty state, Quick Action, polish):** Empty state kalau tidak ada jadwal hari ini, Quick Action Izin (navigasi placeholder) + Bantuan (static content), reminder banner, pull-to-refresh
- **Tahap 4 (Test):** Unit test untuk logic kritis (lihat Testing di bawah)

## Skema/struktur data (kalau relevan)

Tidak ada perubahan schema. Semua data dari `GET /schedules/today` yang sudah ada.

## Edge case yang perlu dihandle

- `GET /schedules/today` return array kosong → tampilkan empty state ("Tidak ada jadwal hari ini"), BUKAN card kosong/error
- Lebih dari 1 jadwal hari ini → tampilkan semua, bukan cuma jadwal pertama
- Network error saat fetch → tampilkan pesan error + tombol retry, bukan layar blank
- Nama user cuma 1 kata (tidak ada 2 kata untuk inisial 2 huruf) → inisial cukup 1 huruf, jangan crash/kosong

## Testing

- Fetch sukses dengan 1 jadwal → card tampil sesuai data
- Fetch sukses dengan array kosong → empty state tampil
- Fetch sukses dengan >1 jadwal → semua jadwal tampil sebagai list
- Fetch gagal (network error) → pesan error + retry tampil
- Badge check-in/check-out sesuai 3 kondisi `statusKehadiran`
- Inisial nama: 2 kata → 2 huruf, 1 kata → 1 huruf
- Tab Izin/Absensi/Notifikasi menampilkan placeholder, tidak crash saat diklik

## Kriteria selesai

- Tab navigation berfungsi (Beranda fungsional, 3 tab lain placeholder tanpa crash)
- Beranda menampilkan data jadwal hari ini sesuai kondisi (ada jadwal/kosong/multiple)
- Semua test di atas lolos
- Tidak ada `any` di kode yang ditulis
- Direview manual oleh user di device asli
