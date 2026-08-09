# Supervisor Approval Izin

## Konteks & tujuan

Tab "Izin" — supervisor lihat pengajuan izin PENDING dari karyawan di sitenya, approve/reject, termasuk lihat dokumen pendukung (sekarang bisa, endpoint GET /leave-requests/:id/dokumen sudah tersedia).

## Requirement

1. leave-requests.service.ts (tambahan di service yang sudah ada dari Track J, reuse bukan duplikat): getPendingLeaveRequests() — GET /leave-requests?status=PENDING, approveLeaveRequest(id, catatanSupervisor?), rejectLeaveRequest(id, catatanSupervisor?), getDocumentUrl/fetch dokumen (GET /leave-requests/:id/dokumen — cek cara terbaik handle response stream biner di React Native: kemungkinan buka via Linking.openURL dengan auth header terlampir tidak straightforward, jadi putuskan pendekatan: download ke cache lokal dulu baru buka dengan viewer, ATAU tampilkan inline kalau gambar dan pakai library PDF viewer kalau pdf — putuskan sesuai kompleksitas, catat di done.md, boleh mulai dari pendekatan paling sederhana dulu).
2. Screen List Izin Pending: tiap item tampilkan nama karyawan, jenis, rentang tanggal, alasan, indikator dokumen ada/tidak (tombol "Lihat Dokumen" kalau ada).
3. Tombol Approve/Reject per item → ConfirmModal. Approve pakai variant baru 'success' (perlu ditambah ke ConfirmModal.tsx dulu, lihat Tahap 1 di bawah), Reject pakai variant 'danger'. catatanSupervisor: input opsional (textarea kecil di dalam modal atau step terpisah — opsional sesuai kontrak, boleh dikosongkan, maks 255 karakter sesuai DTO).
4. Handle race 409 IZIN_SUDAH_DIPROSES (kemungkinan 2 supervisor proses barengan, atau karyawan cancel duluan) — refetch list, pesan jelas, pola sama seperti cancel di IzinScreen Karyawan dulu.

## Edge case

- Dokumen tidak ada (dokumenPendukungUrl null) → tombol "Lihat Dokumen" tidak muncul sama sekali.
- GET dokumen gagal (404 DOKUMEN_TIDAK_DITEMUKAN, edge case file hilang dari disk) → pesan jelas, tidak block approve/reject (approve/reject tetap bisa dilakukan tanpa harus berhasil lihat dokumen dulu, keputusan tetap di tangan supervisor).
- List kosong (tidak ada izin pending) → empty state positif ("semua sudah diproses"), bukan kesan error.

## Testing

- Render list dengan/tanpa dokumen → tombol Lihat Dokumen muncul sesuai kondisi.
- Approve/reject sukses → list refresh.
- 409 race → pesan sesuai, list refresh.
- Fetch dokumen gagal → pesan jelas, tidak crash, approve/reject tetap bisa jalan.

## Kriteria selesai

- Semua requirement terimplementasi.
- Test lolos.
- Verifikasi manual: approve 1 izin dengan dokumen (buka dokumennya beneran), reject 1 izin tanpa catatan.
