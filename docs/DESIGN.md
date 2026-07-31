---
name: Absensi Outsourcing — Flat Utility Yellow
platform: React Native (mobile only)
mode: Light only
colors:
  primary: "#FFC81E"
  on-primary: "#1E1B16"
  background: "#FAFAF8"
  surface: "#FFFFFF"
  foreground: "#1E1B16"
  muted: "#64748B"
  border: "#E4E4DF"
  success: "#16A34A"
  warning: "#EA580C"
  info: "#2563EB"
  destructive: "#DC2626"
  surface-dim: "#e3d9c8"
  surface-bright: "#fff8f1"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#fdf2e1"
  surface-container: "#f7eddc"
  surface-container-high: "#f1e7d6"
  surface-container-highest: "#ece1d0"
  on-surface: "#201b11"
  on-surface-variant: "#4f4632"
  inverse-surface: "#353025"
  inverse-on-surface: "#faefde"
  outline: "#817660"
  outline-variant: "#d2c5ac"
  surface-tint: "#765a00"
  primary-container: "#ffc81e"
  on-primary-container: "#6f5500"
  inverse-primary: "#f5bf0e"
  secondary: "#625e57"
  on-secondary: "#ffffff"
  secondary-container: "#e6ded6"
  on-secondary-container: "#67625b"
  tertiary: "#006875"
  on-tertiary: "#ffffff"
  tertiary-container: "#00e4fd"
  on-tertiary-container: "#00626d"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#ffdf95"
  primary-fixed-dim: "#f5bf0e"
  on-primary-fixed: "#251a00"
  on-primary-fixed-variant: "#594400"
  secondary-fixed: "#e9e1d9"
  secondary-fixed-dim: "#ccc5bd"
  on-secondary-fixed: "#1e1b16"
  on-secondary-fixed-variant: "#4a4640"
  tertiary-fixed: "#9af0ff"
  tertiary-fixed-dim: "#00daf2"
  on-tertiary-fixed: "#001f24"
  on-tertiary-fixed-variant: "#004f58"
  on-background: "#201b11"
  surface-variant: "#ece1d0"
typography:
  family: Plus Jakarta Sans
  body-md:
    fontSize: 16px
    fontWeight: 400
    fontFamily: Plus Jakarta Sans
    lineHeight: 24px
  label-sm:
    fontSize: 12px
    fontWeight: 600
    fontFamily: Plus Jakarta Sans
    lineHeight: 16px
    letterSpacing: 0.02em
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: "800"
    lineHeight: 34px
  heading:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: "700"
    lineHeight: 26px
  title:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: "600"
    lineHeight: 24px
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  full: 999px
  DEFAULT: 0.5rem
  xl: 1.5rem
spacing:
  container-margin: 1rem
  stack-gap: 1rem
  element-gap: 0.5rem
  gutter: 0.75rem
---

# Design System — Aplikasi Absensi Karyawan Outsourcing

## Overview

Flat Design, light mode saja, dengan satu warna aksen kuning (`#FFC81E`) yang dipakai **selektif** — bukan warna dominan di seluruh layar. Sistem ini melayani 3 role dengan kebutuhan sangat berbeda (Karyawan Lapangan: aksi cepat di lapangan; Supervisor: monitoring; HR/Admin: data-dense) lewat satu bahasa visual yang sama, supaya konsisten saat direview lintas mockup Stitch.

Prinsip inti:

- **Serius secara default, hidup di titik krusial.** Warna kuning dipakai buat menandai _satu aksi terpenting_ di tiap layar, bukan tempelan dekoratif.
- **Warna = makna, bukan hiasan.** Setiap warna status memetakan langsung ke enum `HasilVerifikasi` / status dashboard — tidak ada warna "bebas pakai" di luar sistem ini.
- **Tidak ada shadow/gradient.** Pemisahan visual pakai border & kontras background (khas Flat Design), bukan elevation.

---

## Warna

### Warna Dasar

| Token        | Hex       | Kontras (on bg)             | Pemakaian                                                                                   |
| ------------ | --------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| `primary`    | `#FFC81E` | —                           | Aksen utama: tombol Absensi (center nav), CTA paling penting per layar, indikator tab aktif |
| `on-primary` | `#1E1B16` | ~11:1 di atas primary (AAA) | **Wajib** teks/ikon gelap di atas kuning — putih gagal kontras total                        |
| `background` | `#FAFAF8` | —                           | Latar layar                                                                                 |
| `surface`    | `#FFFFFF` | —                           | Card, sheet, input field                                                                    |
| `foreground` | `#1E1B16` | 15.8:1 di atas surface      | Teks utama                                                                                  |
| `muted`      | `#64748B` | 4.6:1 di atas surface       | Teks sekunder, label, placeholder                                                           |
| `border`     | `#E4E4DF` | —                           | Pembatas card/list, bukan shadow                                                            |

### Warna Semantik — Status Kehadiran

Dipakai konsisten di semua role: layar hasil check-in Karyawan, dashboard Supervisor, tabel audit HR.

| Status         | Token         | Hex       | Sumber data                                            |
| -------------- | ------------- | --------- | ------------------------------------------------------ |
| Hadir / Valid  | `success`     | `#16A34A` | `HasilVerifikasi.VALID`, dashboard `HADIR`             |
| Terlambat      | `warning`     | `#EA580C` | dashboard `TERLAMBAT`                                  |
| Izin           | `info`        | `#2563EB` | dashboard `IZIN`                                       |
| Belum check-in | `muted`       | `#64748B` | dashboard `BELUM`                                      |
| Tidak hadir    | `destructive` | `#DC2626` | `HasilVerifikasi.TIDAK_HADIR`, dashboard `TIDAK_HADIR` |

---

## Tipografi

**Plus Jakarta Sans**

| Level   | Size | Weight          | Pemakaian             |
| ------- | ---- | --------------- | --------------------- |
| Display | 28px | 800 (ExtraBold) | Judul layar utama     |
| Heading | 20px | 700 (Bold)      | Judul section         |
| Title   | 16px | 600 (SemiBold)  | Judul card            |
| Body    | 16px | 400 (Regular)   | Teks utama            |
| Label   | 12px | 600 (SemiBold)  | Section header, badge |

---

## Komponen Kunci

### Tombol

- **Primary button**: fill `primary`, teks `on-primary`, radius `md`.
- **Secondary button**: outline 1px `border`, teks `foreground`.

### Status Badge

Pill kecil (`radius: sm`), background soft (opacity ~15%) + teks warna solid + ikon.

### Bottom Navigation

State aktif pakai warna `primary`. Karyawan Lapangan memiliki tombol **Absensi** yang menonjol di tengah.
