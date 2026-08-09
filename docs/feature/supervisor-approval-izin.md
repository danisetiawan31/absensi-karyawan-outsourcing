# Supervisor Approval Izin

## Konteks & tujuan

Tab "Izin" — supervisor lihat pengajuan izin PENDING dari karyawan di sitenya, approve/reject, termasuk lihat dokumen pendukung (endpoint GET /leave-requests/:id/dokumen sudah tersedia).

## Requirement

1. Dependency baru: expo-file-system, expo-sharing (dikonfirmasi, tidak ada alternatif lebih ringan untuk native file share).
2. Tambahan di leave-requests.service.ts (reuse file yang sudah ada dari Track J, bukan file baru):
   - getPendingLeaveRequests(): GET /leave-requests?status=PENDING.
   - approveLeaveRequest(id, catatanSupervisor?): PATCH /leave-requests/:id/approve.
   - rejectLeaveRequest(id, catatanSupervisor?): PATCH /leave-requests/:id/reject.
   - downloadAndOpenDocument(id, filename): pakai apiClient.get(`/leave-requests/${id}/dokumen`, { responseType: 'arraybuffer' }) → tulis ke cache via expo-file-system → buka share sheet via expo-sharing. Tangani error (404 DOKUMEN_TIDAK_DITEMUKAN) dengan pesan jelas, jangan crash.
3. Screen List Izin Pending: tiap item — nama karyawan, jenis, rentang tanggal, alasan, tombol "Lihat Dokumen" (HANYA muncul kalau dokumenPendukungUrl !== null).
4. Tombol Approve/Reject per item → ConfirmModal. Approve pakai variant 'success' (sudah ditambahkan di Tahap 1 supervisor-jadwal), Reject pakai variant 'danger'. catatanSupervisor: input teks opsional di dalam modal (maks 255 karakter, sesuai DTO — tidak perlu validasi minimum).
5. Handle race 409 IZIN_SUDAH_DIPROSES — refetch list, pesan jelas, pola sama seperti cancel di IzinScreen Karyawan dan delete di SupervisorJadwalScreen.

## Edge case

- Dokumen tidak ada → tombol "Lihat Dokumen" tidak render sama sekali.
- Download dokumen gagal (404 DOKUMEN_TIDAK_DITEMUKAN, network error) → pesan jelas via AlertBanner, TIDAK block approve/reject (keputusan approve/reject tetap bisa dilakukan tanpa harus berhasil lihat dokumen).
- List kosong → empty state positif ("Semua pengajuan sudah diproses"), bukan kesan error.
- catatanSupervisor kosong saat approve/reject → valid, tidak perlu dipaksa diisi (sesuai DTO opsional).

## Testing

- Render list dengan/tanpa dokumen → tombol Lihat Dokumen sesuai kondisi.
- Approve/reject sukses (dengan dan tanpa catatanSupervisor) → list refresh.
- 409 race → pesan sesuai, list refresh.
- Download dokumen gagal → pesan jelas, approve/reject tetap bisa dilakukan setelahnya.
- List kosong → empty state.
- Double-tap approve/reject guard (pola useRef konsisten).

## Kriteria selesai

- Semua requirement terimplementasi.
- Test lolos.
- Verifikasi manual: approve 1 izin dengan dokumen (buka dokumennya beneran di device), reject 1 izin tanpa catatan.
