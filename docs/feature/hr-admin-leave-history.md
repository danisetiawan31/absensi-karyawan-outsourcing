# HR Admin — Riwayat Izin (Read-Only)

## Konteks & tujuan

Tab "Izin" HR Admin — read-only, HR lihat seluruh riwayat pengajuan izin (semua status, bukan cuma PENDING), filter by karyawan/periode, bisa buka dokumen pendukung. Tidak ada aksi approve/reject di sini (itu domain Supervisor).

## Requirement

1. Ekstrak getStatusIzinBadgeConfig dari IzinScreen.tsx (Karyawan) ke lokasi shared (mis. src/utils/status-izin-badge.ts), IzinScreen.tsx di-refactor import dari situ (single source of truth, bukan duplikasi).
2. leave-requests.service.ts (sudah ada): tambah getLeaveRequestsHistory(karyawanId?, periodeMulai?, periodeSelesai?) — GET /leave-requests/history.
3. Screen: filter periode (default 30 hari terakhir, auto-terisi saat mount), filter karyawan opsional (picker dari getEmployees({role: 'KARYAWAN'}) dengan search-by-nama).
4. List: nama karyawan, jenis, rentang tanggal, status badge (reuse hasil ekstraksi poin 1), catatanSupervisor, nama approvedBy, tombol "Lihat Dokumen" (reuse downloadAndOpenDocument, HANYA muncul kalau dokumenPendukungUrl !== null).
5. TIDAK ADA aksi approve/reject/cancel — murni read-only.

## Edge case

- Filter periode dikosongkan manual oleh HR (lihat histori lengkap tanpa batas) → dibiarkan (keputusan sadar HR), TIDAK perlu warning tambahan — cukup biarkan loading state jelas kalau datanya besar.
- Known limitation: backend tidak ada pagination — dicatat, bukan diperbaiki di fitur ini. Kalau nanti data besar dan performa jadi masalah nyata, itu task backend terpisah.
- Tidak ada dokumen → tombol tidak render.
- List kosong → EmptyState.

## Testing

- Ekstraksi badge config: assert IzinScreen.tsx dan screen baru ini sama-sama pakai fungsi yang sama (import dari lokasi shared), bukan duplikat.
- Service layer: query params (termasuk kombinasi opsional).
- Default filter periode 30 hari terisi otomatis saat mount.
- Filter karyawan (search, pilih, hasil ter-filter).
- Lihat Dokumen: sama seperti Supervisor sebelumnya (reuse, tidak perlu test ulang detail internal, cukup assert dipanggil dengan id benar).
- List kosong → EmptyState.

## Kriteria selesai

- 2 tahap: (1) ekstraksi shared + service layer, (2) screen.
- Test lolos.
- Verifikasi manual: lihat riwayat izin lintas beberapa karyawan, buka 1 dokumen.
