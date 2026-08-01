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
  success-bg: "#DCFCE7"
  success-text: "#166534"
  warning: "#EA580C"
  warning-bg: "#FFEDD5"
  warning-text: "#9A3412"
  info: "#2563EB"
  info-bg: "#DBEAFE"
  info-text: "#1E40AF"
  destructive: "#DC2626"
  destructive-bg: "#FEE2E2"
  destructive-text: "#991B1B"
typography:
  family: Plus Jakarta Sans
  display: { fontSize: 28px, fontWeight: "800", lineHeight: 34px }
  heading: { fontSize: 20px, fontWeight: "700", lineHeight: 26px }
  title: { fontSize: 16px, fontWeight: "600", lineHeight: 24px }
  body: { fontSize: 16px, fontWeight: "400", lineHeight: 24px }
  label:
    {
      fontSize: 12px,
      fontWeight: "600",
      lineHeight: 16px,
      letterSpacing: 0.02em,
    }
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  full: 999px
spacing:
  container-margin: 1rem
  stack-gap: 1rem
  element-gap: 0.5rem
  gutter: 0.75rem
---

# Design System — Aplikasi Absensi Karyawan Outsourcing

## Overview

Flat design, light mode saja, satu warna aksen kuning (`#FFC81E`) dipakai **selektif** — bukan warna dominan di seluruh layar. Ini KONSEP DASAR, bukan spec kaku (lihat AGENTS.md § Design Reference) — hex, radius, dan komposisi layout boleh ditafsir ulang, tapi pemetaan semantik warna status di bawah WAJIB konsisten di semua role.

Prinsip inti:

- **Serius secara default, hidup di titik krusial** — kuning menandai satu aksi terpenting per layar, bukan tempelan dekoratif.
- **Warna = makna** — tiap warna status memetakan langsung ke enum `HasilVerifikasi`/status dashboard.
- **Tidak ada shadow/gradient** — pemisahan visual pakai border & kontras background.
- **Satu undertone neutral** — semua abu di sistem ini cool-gray (searah `muted`), tidak dicampur dengan neutral warm/cream.

## Warna Dasar

| Token        | Hex            | Pemakaian                                        |
| ------------ | -------------- | ------------------------------------------------ |
| `primary`    | `#FFC81E`      | Aksen utama: CTA terpenting per layar, tab aktif |
| `on-primary` | `#1E1B16`      | Wajib teks/ikon gelap di atas kuning             |
| `background` | `#FAFAF8`      | Latar layar                                      |
| `surface`    | `#FFFFFF`      | Card, sheet, input field                         |
| `foreground` | `#1E1B16`      | Teks utama                                       |
| `muted`      | `#64748B`      | Teks sekunder, label, placeholder                |
| `border`     | `#E4E4DF`      | Pembatas card/list                               |
| Token        | `full` (999px) |                                                  |

## Warna Semantik — Status Kehadiran

Tiap status: warna solid (ikon/aksen tegas) + pasangan bg/text soft (badge) + ikon Ionicons (dari `@expo/vector-icons`, bawaan Expo).

| Status         | Solid     | Badge bg  | Badge text | Icon (Ionicons)         | Sumber data                                  |
| -------------- | --------- | --------- | ---------- | ----------------------- | -------------------------------------------- |
| Hadir/Valid    | `#16A34A` | `#DCFCE7` | `#166534`  | `checkmark-circle`      | `HasilVerifikasi.VALID`, `HADIR`             |
| Terlambat      | `#EA580C` | `#FFEDD5` | `#9A3412`  | `time-outline`          | `TERLAMBAT`                                  |
| Izin           | `#2563EB` | `#DBEAFE` | `#1E40AF`  | `document-text-outline` | `IZIN`                                       |
| Belum check-in | `#64748B` | `#F1F5F9` | `#475569`  | `ellipse-outline`       | `BELUM`                                      |
| Tidak hadir    | `#DC2626` | `#FEE2E2` | `#991B1B`  | `close-circle`          | `HasilVerifikasi.TIDAK_HADIR`, `TIDAK_HADIR` |

## Tipografi

**Plus Jakarta Sans** — Display 28px/800, Heading 20px/700, Title 16px/600, Body 16px/400, Label 12px/600.

## Komponen Kunci

- **Primary button**: fill `primary`, teks `on-primary`, radius `md` (8px).
- **Secondary button**: outline 1px `border`, teks `foreground`, radius `md`.
- **Status badge**: pill (radius `full`), bg soft dari tabel semantik, ikon Ionicons 14-16px + teks warna gelap pasangannya, padding horizontal ≈12-14px supaya bentuk pill gak kepenyet.
- **Card**: `surface` bg, border 1px `border`, radius `lg` (12px).
- **Bottom Navigation**: state aktif pakai `primary`. Karyawan Lapangan punya tombol Absensi menonjol di tengah.
