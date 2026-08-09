# Supervisor Jadwal (Schedule Management)

## Konteks & tujuan

Tab "Jadwal" — supervisor kelola shift karyawan di site yang diawasinya: lihat jadwal, buat baru, edit, hapus.

## Requirement

1. schedules.service.ts: getSchedules(tanggal, siteId?), createSchedule(...), updateSchedule(id, ...), deleteSchedule(id). Ikuti kontrak API-Contract.md §4.
2. supervisor-sites.service.ts: getSupervisorSites() — GET /supervisor-sites (scoped otomatis dari JWT, tanpa query param untuk role SUPERVISOR, sesuai investigasi).
3. employees.service.ts (tambahan): getAvailableEmployees(tanggal, siteId) — GET /employees/available. PENTING: hasil TIDAK ter-filter per site (sudah dikonfirmasi backend), jadi UI WAJIB sediakan search-by-nama di picker supaya tetap usable saat jumlah karyawan banyak.
4. Screen List Jadwal (tab index): filter by tanggal (default hari ini) dan site (dropdown dari getSupervisorSites() — kalau supervisor cuma awasi 1 site, skip dropdown, langsung terapply). List jadwal per karyawan: nama, site, jam mulai-selesai. Tombol edit/hapus per item, tombol tambah jadwal baru.
5. Form create/edit jadwal: site picker (dari supervisor-sites), karyawan picker (dari employees/available, DENGAN search by nama), tanggal, jam mulai, jam selesai. Validasi client-side durasi shift 1-16 jam (mirror DURASI_SHIFT_TIDAK_VALID dari backend) sebelum submit.
6. Delete jadwal: ConfirmModal variant danger. Kalau gagal 409 SUDA_ADA_AKTIVITAS → tampilkan pesan generik dari server apa adanya (sudah cukup jelas, sudah dikonfirmasi dari investigasi), sarankan pakai edit sebagai alternatif.

## Edge case

- Supervisor cuma awasi 1 site → skip site picker, auto-select.
- getAvailableEmployees kosong (semua karyawan sudah ada jadwal/izin di tanggal itu) → pesan jelas di picker, bukan silent empty.
- Durasi shift invalid → blocked client-side dengan pesan jelas sebelum submit.

## Testing

- Service layer: query params & response parsing.
- Form: validasi durasi shift, employee picker search filter, site picker auto-select saat cuma 1 site.
- Delete: ConfirmModal muncul, 409 ditangani dengan pesan yang benar.

## Kriteria selesai

- Semua requirement terimplementasi, dipecah per langkah kerja.
- Test lolos.
- Verifikasi manual: buat jadwal baru untuk karyawan di Wisma Atlet, edit, hapus.
