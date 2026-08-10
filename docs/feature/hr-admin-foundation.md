# HR Admin Foundation — Tab Navigator Scaffold

## Konteks & tujuan

Route group (hr-admin)/ sudah ada sejak Track H (role guard terpasang, redirect setelah login benar), masih Stack placeholder murni. Fitur ini bangun fondasi navigasi sebelum 4 item substantif Track L berikutnya (employees, sites, leave-history, reports) masing-masing punya tempat.

Tidak ada endpoint /notifications untuk role HR_ADMIN (sudah dikonfirmasi API-Contract.md — cuma KARYAWAN & SUPERVISOR), jadi TIDAK ADA tab Notifikasi untuk role ini.

## Requirement

1. Tab navigator (hr-admin)/_layout.tsx: <Tabs> dengan 4 tab — Karyawan, Site, Izin, Laporan. Mapping 1:1 ke 4 item Track L berikutnya. Role guard yang sudah ada JANGAN diubah.
2. Tab bar reguler (bukan tombol menonjol seperti Karyawan) — HR Admin tidak punya 1 aksi tunggal yang setara "Absensi"/tidak ada preseden aksi utama tunggal, sama seperti Supervisor.
3. index.tsx (tab pertama, "Karyawan") untuk tahap ini tetap placeholder <ComingSoonPlaceholder /> — isi sungguhannya masuk item hr-admin-employees berikutnya. 3 tab lain juga placeholder.

## Testing

- Tab navigator render 4 tab dengan label/ikon yang benar, role guard tetap berfungsi.

## Kriteria selesai

- Tab navigator terpasang, role guard utuh, 4 placeholder screen ter-route dengan benar.
- Verifikasi manual: login hr@test.local, cek 4 tab muncul dan bisa dinavigasi.
