# Supervisor Dashboard Mobile

## Konteks & tujuan

Item pertama Track K. Route group (supervisor)/ sudah ada sejak Track H (role guard sudah terpasang, redirect setelah login sudah benar), tapi masih Stack placeholder murni — belum ada tab navigator maupun screen sungguhan. Fitur ini membangun fondasi navigasi Supervisor SEKALIGUS dashboard monitoring kehadiran harian (menggabungkan GET /dashboard/attendance dan GET /dashboard/unfilled-shifts, karena keduanya sama-sama domain "status hari ini" yang dilihat bareng).

## Requirement

1. Tab navigator (supervisor)/_layout.tsx: <Tabs> dengan 4 tab — Dashboard, Jadwal, Izin, Notifikasi (placeholder untuk 3 tab terakhir di tahap ini, akan diisi di item Track K berikutnya). TIDAK perlu tombol menonjol di tengah seperti Karyawan (Supervisor tidak punya 1 aksi tunggal yang setara "Absensi") — tab bar reguler.
2. dashboard.service.ts: getAttendanceDashboard(tanggal), getUnfilledShifts(tanggal) — keduanya butuh query param tanggal wajib (default: hari ini, Jakarta timezone).
3. Screen Dashboard (tab index):
   - Unfilled shifts alert (kalau ada item, T+15 belum check-in) ditampilkan sebagai section/banner MENONJOL di atas — ini info paling urgent buat supervisor (perlu tindakan: hubungi karyawan/cari pengganti).
   - List status kehadiran per karyawan di bawahnya, StatusBadge per status (HADIR/BELUM/TERLAMBAT/IZIN/TIDAK_HADIR — REUSE mapping resmi DESIGN.md yang sudah ada, JANGAN definisikan ulang).
   - Data ter-scope otomatis ke seluruh site yang diawasi supervisor (backend sudah handle ini, tidak perlu site picker di UI kecuali mau future enhancement).
   - Default tanggal hari ini, tidak perlu date picker di tahap ini (bisa jadi enhancement terpisah nanti kalau dibutuhkan).
4. Reuse komponen shared yang sudah ada (ScreenHeader, LoadingState/ErrorState/EmptyState, StatusBadge, SectionCard, AlertBanner).

## Skema/struktur data

Tidak ada perubahan schema.prisma (backend Track F sudah selesai). Tambahan mobile: dashboard.service.ts, types di src/types/ sesuai shape yang sudah dikonfirmasi investigasi (DashboardAttendanceItem, UnfilledShiftItem).

## Edge case yang perlu dihandle

- Supervisor belum di-assign ke site manapun (SupervisorSite kosong) → dashboard tampil kosong, bukan error.
- Tidak ada shift hari ini sama sekali → empty state, bukan crash.
- Unfilled shifts kosong (semua sudah check-in atau memang tidak ada shift terlambat) → section ini tidak perlu tampil sama sekali (jangan tampilkan "0 unfilled shifts", cukup sembunyikan section-nya).

## Testing

- Tab navigator render 4 tab dengan label/ikon yang benar.
- Dashboard: render list dengan berbagai status → assert StatusBadge variant sesuai (5 status).
- Unfilled shifts: render saat ada data, TIDAK render section saat array kosong.
- Empty state saat tidak ada shift sama sekali.
- Loading/error state standar.

## Kriteria selesai

- Semua requirement terimplementasi, dipecah per langkah kerja (AGENTS.md §3.2): navigator scaffold, service layer, dashboard screen (attendance list), unfilled shifts section.
- Semua test lolos.
- Screenshot verifikasi visual WAJIB di titik screen Dashboard pertama kali menampilkan data sungguhan (bukan cuma tab navigator kosong) — ini referensi visual baru role Supervisor yang akan dikunci untuk screen-screen berikutnya (Jadwal, Izin, Notifikasi Supervisor).
- Verifikasi manual: login sebagai spv@test.local, lihat dashboard menampilkan data site Wisma Atlet dengan benar.
