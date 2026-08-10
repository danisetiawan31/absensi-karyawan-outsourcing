# HR Admin — Laporan & Rekap Kehadiran

## Konteks & tujuan

Tab "Laporan" — HR lihat ringkasan kehadiran per karyawan (agregat), drill-down ke detail percobaan absensi per karyawan, dan export laporan PDF/XLSX untuk periode tertentu. Item terakhir Track L.

## Requirement

1. Service layer (attendance.service.ts yang sudah ada, atau file baru reports.service.ts — putuskan penempatan yang rapi):
   - getAttendanceSummary(periodeMulai, periodeSelesai): GET /attendance/summary.
   - getAttendanceAttempts(karyawanId, periodeMulai, periodeSelesai): GET /attendance/attempts (semua param wajib, drill-down per karyawan).
   - downloadAndOpenReport(format: 'pdf'|'xlsx', periodeMulai, periodeSelesai): GET /reports/export, nama file dikonstruksi client-side (mis. laporan-kehadiran-{periodeMulai}-{periodeSelesai}.{format}), reuse pola FileSystem.downloadAsync + Sharing.shareAsync (fungsi terpisah dari downloadAndOpenDocument, endpoint & konstruksi nama file berbeda).
2. Filter periode (WAJIB diisi untuk kedua endpoint summary maupun export, native date picker konsisten dengan pola project — TIDAK ada default "kosongkan untuk semua" seperti leave-history, karena backend mewajibkan periode untuk endpoint ini).
3. Screen summary: list card per karyawan (SectionCard), tiap card grid metric 2x3 (totalJadwal, totalHadir, totalTerlambat, totalTidakHadir, totalIzin, totalBelum) dengan ikon/warna yang jelas per metrik (konsultasi token warna resmi — Hadir=success, Terlambat=warning, TidakHadir=destructive, Izin=info, Belum=muted, totalJadwal=netral sebagai total).
4. Tombol export 2 opsi (PDF/XLSX) — panggil downloadAndOpenReport dengan periode filter yang sedang aktif. Loading state eksplisit selama download (bisa memakan waktu untuk periode panjang).
5. Tap card karyawan → navigasi/modal attempts drill-down: list percobaan absensi (tipe CHECK_IN/CHECK_OUT, waktu, hasil verifikasi dengan badge — REUSE token warna yang sudah dipakai untuk HasilVerifikasi di tempat lain jika ada, atau definisikan konsisten dengan tabel status kehadiran DESIGN.md).

## Edge case

- Periode belum diisi → tombol export/fetch summary disabled dengan pesan jelas, JANGAN submit request tanpa periode (backend akan reject, tapi baiknya dicegah di client dulu).
- Export gagal (network/timeout untuk file besar) → pesan jelas, tidak crash.
- Summary kosong (tidak ada karyawan/jadwal di periode itu) → EmptyState.
- Attempts kosong untuk karyawan tertentu → EmptyState di drill-down.

## Testing

- Service layer: query params (termasuk validasi wajib), nama file export terkonstruksi benar.
- Summary: render grid metric per karyawan, warna sesuai token.
- Filter periode wajib → tombol disabled tanpa periode.
- Export: loading state, downloadAndOpenReport terpanggil dengan format & periode benar.
- Drill-down: tap card → attempts terpanggil dengan karyawanId benar, render list dengan badge hasil verifikasi.
- Empty states.

## Kriteria selesai

- 3 tahap (service layer, summary screen, drill-down).
- Test lolos.
- Verifikasi manual: lihat summary periode tertentu, export PDF dan XLSX (buka keduanya beneran), drill-down ke 1 karyawan lihat attempts.
