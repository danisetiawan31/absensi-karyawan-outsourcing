# Face Registration Mobile

## Konteks & tujuan

Gate wajib untuk role KARYAWAN sebelum bisa akses fitur inti (jadwal, attendance) — mirip pola gate `wajibGantiPassword` yang sudah dibangun di Auth Mobile, tapi untuk `wajahTerdaftar`. Karyawan capture 1 foto wajah (live, bukan galeri — mencegah fraud identitas), lalu foto dikirim ke `POST /users/me/face-registration` untuk diproses jadi `faceEmbedding` di backend.

## Requirement

1. **Gate check** — dicek di titik yang sama seperti gate `wajibGantiPassword` (root layout atau layout `(karyawan)`): kalau `role === KARYAWAN` dan `wajahTerdaftar === false`, redirect paksa ke screen registrasi wajah. Tidak bisa diakses/dilewati manual — mirip pola `ChangePasswordRequiredScreen` (tidak ada tombol back/skip).

2. **Camera capture screen**:
   - Kamera depan (front-facing) default, live capture — TIDAK ada opsi pilih dari galeri
   - Oval overlay statis sebagai panduan posisi wajah (garis panduan visual saja, BUKAN deteksi wajah real-time/face tracking)
   - Handle permission kamera: minta izin saat screen dibuka, kalau ditolak tampilkan pesan jelas + tombol buka Settings (tidak bisa lanjut tanpa izin kamera, karena ini fitur wajib)
   - Tombol capture mengambil 1 foto (snapshot), bukan scan/stream berkelanjutan

3. **Preview screen** (setelah capture):
   - Tampilkan foto full-screen (BUKAN lightbox/modal — foto langsung besar begitu capture selesai)
   - 2 tombol: "Ambil Ulang" (kembali ke kamera) dan "Gunakan Foto Ini" (lanjut submit)

4. **Submit & integrasi API**:
   - Hit `POST /users/me/face-registration` (multipart/form-data, field `foto`)
   - Loading state jelas saat upload+proses (foto perlu dikirim ke Python face-service, bisa memakan waktu — beri indikator progress/loading yang eksplisit, bukan spinner generic tanpa konteks, sesuai AGENTS.md soal panggilan face-service yang lambat)
   - Sukses → update `wajahTerdaftar` di authStore jadi `true` (tidak perlu re-login, cukup update state lokal), redirect ke Home Karyawan
   - Gagal → tampilkan pesan error, kembali ke preview atau kamera (user bisa retry capture), JANGAN biarkan user stuck tanpa jalan keluar

5. **Visual** — konsisten dengan referensi visual Login yang sudah dikunci (tombol, warna, tipografi), TAPI khusus screen kamera boleh full-bleed/dark background (wajar untuk UI kamera, bukan pelanggaran token — sesuaikan dengan konteks kamera native yang biasanya bukan pakai card putih seperti form).

## Tahapan implementasi (maksimal 4 tahap)

- **Tahap 1 (Camera screen):** Setup `expo-camera`, permission handling, oval overlay statis, tombol capture, ambil 1 foto ke state lokal (belum submit ke API).
- **Tahap 2 (Preview screen + navigasi capture↔preview):** Full-screen image preview, tombol "Ambil Ulang" (balik ke Tahap 1) dan "Gunakan Foto Ini" (lanjut ke Tahap 3).
- **Tahap 3 (Submit + gate integrasi):** Integrasi `POST /users/me/face-registration`, loading state eksplisit, update `wajahTerdaftar` di authStore setelah sukses, redirect ke Home Karyawan, gate check di layout `(karyawan)` yang redirect ke screen ini kalau `wajahTerdaftar === false`.
- **Tahap 4 (Test):** Unit test untuk logic kritis (lihat Testing di bawah).

## Edge case yang perlu dihandle

- Permission kamera ditolak → tidak bisa lanjut, pesan jelas + link ke Settings device
- Upload gagal (network error/timeout) → user bisa retry, tidak kehilangan foto yang sudah diambil (opsional: simpan foto di state sampai submit berhasil)
- User keluar app di tengah proses (sebelum submit selesai) → saat app dibuka lagi, gate check tetap jalan (redirect ulang ke screen ini kalau `wajahTerdaftar` masih `false`)
- Foto gagal diproses backend (kualitas terlalu buruk, dst — cek response error dari endpoint ini di API-Contract kalau ada error code spesifik, kalau tidak ada, tangani sebagai generic error dengan pesan retry)

## Testing

- Camera: permission ditolak → tampil pesan + tidak bisa lanjut
- Capture → foto tersimpan ke state, navigasi ke preview
- Preview: "Ambil Ulang" → kembali ke kamera, state foto lama dibuang
- Preview: "Gunakan Foto Ini" → lanjut ke submit
- Submit sukses → `wajahTerdaftar` di authStore jadi `true`, redirect ke Home Karyawan
- Submit gagal → pesan error tampil, user bisa retry
- Gate: role KARYAWAN + `wajahTerdaftar: false` → redirect ke screen ini otomatis

## Kriteria selesai

- Alur lengkap: gate redirect → kamera → preview → submit → Home Karyawan berjalan tanpa error
- Semua test di atas lolos
- Tidak ada `any` di kode yang ditulis
- Direview manual oleh user di device asli (kamera tidak bisa ditest penuh di web/simulator tanpa kamera fisik)
