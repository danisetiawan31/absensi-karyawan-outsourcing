# HR Admin — Manajemen Karyawan

## Konteks & tujuan

Tab "Karyawan" — HR Admin kelola seluruh user (KARYAWAN/SUPERVISOR/HR_ADMIN): lihat, buat baru, edit, reset registrasi wajah.

## Requirement

1. employees.service.ts: getEmployees(search?, role?, statusAktif?), createEmployee(nama, email, role), updateEmployee(id, partial), resetFaceRegistration(id).
2. List screen: filter search-by-nama/email, filter role, filter statusAktif. Tiap item: nama, email, role, badge statusAktif (aktif/nonaktif — token success/muted), badge wajahTerdaftar (terdaftar/belum — token success/muted, BUKAN reuse StatusBadge status kehadiran, ini domain berbeda meski variant token sama).
3. Form create: nama, email, role (picker 3 opsi). Submit → navigasi ke screen terpisah nampilin passwordSementara dengan peringatan tegas + copy-to-clipboard (expo-clipboard, dependency baru — perlu konfirmasi). User wajib tekan tombol eksplisit untuk lanjut, TIDAK auto-dismiss.
4. Form edit: nama, email, statusAktif (toggle), role (picker). Perubahan nama/email/statusAktif submit langsung. Perubahan role WAJIB lewat ConfirmModal variant='warning' terpisah, eksplisit menunjukkan "role lama → role baru" sebelum submit.
5. Aksi reset face registration per item (di list atau di form edit): ConfirmModal variant='warning', deskripsi eksplisit menjelaskan konsekuensi (karyawan wajib registrasi ulang saat app dibuka berikutnya — TIDAK ada notifikasi otomatis ke karyawan).
6. Handle error EMAIL_SUDAH_DIPAKAI (409) dari create/update — pesan jelas di form, bukan generic error.

## Edge case

- Email duplikat → pesan spesifik EMAIL_SUDAH_DIPAKAI, bukan error generic.
- List kosong (hasil filter tidak ada) → empty state.
- HR Admin demote SUPERVISOR yang masih punya SupervisorSite assignment aktif → backend tidak auto-cleanup assignment ini (perlu diverifikasi terpisah saat hr-admin-sites, dicatat sebagai known consideration, bukan blocking di sini).

## Testing

- Service layer: query params & payload.
- List: filter search/role/statusAktif, badge sesuai kondisi.
- Create: passwordSementara screen muncul, copy-to-clipboard berfungsi, tidak auto-dismiss.
- Edit: field biasa submit langsung, role change wajib lewat ConfirmModal terpisah.
- Reset face: ConfirmModal dengan pesan konsekuensi yang benar.
- EMAIL_SUDAH_DIPAKAI → pesan spesifik tampil.

## Kriteria selesai

- Semua requirement terimplementasi, dipecah 4 tahap (service layer, list+filter, create+password reveal, edit+role-change+reset-face).
- Test lolos.
- Verifikasi manual: buat karyawan baru, catat password, login pakai akun itu (verifikasi wajibGantiPassword ke-trigger), reset face registration 1 akun.
