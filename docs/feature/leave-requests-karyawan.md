# Leave Requests Mobile — Karyawan

## Konteks & tujuan

Item kedua Track J. Tab "Izin" (src/app/(karyawan)/izin.tsx) saat ini masih placeholder murni. Scope: karyawan bisa lihat riwayat pengajuan izin sendiri, ajukan izin baru, dan batalkan pengajuan yang masih PENDING.

## Requirement

1. Tab Izin jadi list screen: fetch GET /leave-requests (scope KARYAWAN, tanpa query param — sudah terkonfirmasi backend auto-scope by JWT), tampilkan array PengajuanIzin sorted createdAt desc (urutan sudah dari backend).
2. Tiap item list tampilkan: jenis, rentang tanggal, status badge (pakai pemetaan warna di atas), alasan (truncated/expandable), catatanSupervisor kalau ada, nama approvedBy kalau ada.
3. Tombol "Ajukan Izin" (floating action button atau tombol di header list) → navigasi ke screen form baru /(karyawan)/leave-request-create.
4. Aksi batalkan (PATCH /leave-requests/:id/cancel) HANYA muncul untuk item berstatus PENDING. Setelah cancel berhasil, refresh list. Handle race condition IZIN_SUDAH_DIPROSES (409, kalau supervisor keburu approve/reject sebelum cancel diproses) — refetch list otomatis, tampilkan pesan bahwa status sudah berubah, JANGAN treated sebagai error generik yang membingungkan.
5. Screen form leave-request-create:
   - Field jenis: SAKIT | IZIN | CUTI (segmented control/pilihan, ikuti styling token project — tidak ada pola existing utk selector jenis ini, boleh dirancang baru konsisten dgn design tokens).
   - Field tanggalMulai, tanggalSelesai: date picker (@react-native-community/datetimepicker — dependency baru).
   - Field alasan: text input multiline.
   - Field dokumen: optional/conditional file picker (expo-document-picker — dependency baru), scope tipe file ke ['application/pdf','image/jpeg','image/png'], validasi ukuran client-side maks 5MB SEBELUM upload (cek cepat, bukan pengganti validasi server).
   - WAJIB replikasi persis logic DOKUMEN_WAJIB dari backend: dokumen jadi WAJIB (tampilkan indikator visual + block submit tanpa dokumen) HANYA kalau jenis === SAKIT DAN tanggalSelesai > tanggalMulai (strictly lebih besar, bukan >=; sama hari = opsional). Semua kombinasi lain (IZIN/CUTI apapun durasinya, atau SAKIT 1 hari) = dokumen opsional.
   - Validasi client-side tanggalSelesai >= tanggalMulai (mirror RENTANG_TANGGAL_TIDAK_VALID dari backend) — sebelum submit, bukan cuma andalkan server reject.
   - Submit: POST /leave-requests multipart/form-data sesuai API-Contract.md §6.
   - Response handling: sukses (201-ish, { id, status: 'PENDING' }) → navigasi balik ke list/tab Izin dengan refresh. Error DOKUMEN_WAJIB/IZIN_BENTROK/RENTANG_TANGGAL_TIDAK_VALID → tampilkan pesan spesifik dari server (fallback safety net kalau client-side validation somehow ke-lewat).

## Skema/struktur data

Tidak ada perubahan schema.prisma (backend Track D sudah selesai). Tambahan mobile: leave-requests.service.ts (fungsi getLeaveRequests, createLeaveRequest, cancelLeaveRequest) dan types di src/types/ sesuai shape API-Contract.md §6.

## Edge case yang perlu dihandle

- List kosong (belum pernah ajukan izin) → empty state yang jelas, tombol "Ajukan Izin" tetap terlihat.
- Dokumen jadi wajib/opsional secara dinamis saat user ubah jenis/tanggal di form — indikator visual harus reaktif mengikuti state form saat ini, bukan statis.
- Cancel race condition (IZIN_SUDAH_DIPROSES) — sudah dijelaskan di requirement #4.
- File dokumen melebihi 5MB atau tipe tidak didukung → tolak di client SEBELUM upload, pesan jelas, jangan buang request ke server untuk kasus yang sudah pasti gagal.
- Submit ganda (double-tap) → sama seperti pola attendance-mobile Tahap 3, pakai lock berbasis ref (bukan cuma state) untuk mencegah race.

## Testing

- Service layer: assert payload FormData benar (termasuk kasus dokumen null/undefined saat opsional).
- List: render status badge sesuai warna yang benar per status; cancel button hanya muncul untuk PENDING; cancel sukses → list refresh; cancel race (409) → pesan sesuai, bukan error generik.
- Form: validasi DOKUMEN_WAJIB client-side sesuai 4 kombinasi jenis+durasi yang disebutkan; validasi tanggal; double-tap guard submit (assert service function terpanggil 1x, pola sama seperti processAttendanceSubmit).

## Kriteria selesai

- Semua requirement terimplementasi, dipecah per langkah kerja sesuai AGENTS.md §3.2.
- Semua test lolos.
- Verifikasi manual: ajukan izin SAKIT 1 hari (dokumen opsional, submit tanpa dokumen harus sukses), ajukan SAKIT 2+ hari tanpa dokumen (harus diblok client-side), cancel izin PENDING, lihat badge warna tiap status.
