# Attendance Mobile — Check-in/Check-out Karyawan

## Konteks & tujuan

Item pertama Track J. Melengkapi flow E2E wajib yang sudah didokumentasikan di AGENTS.md §5 Mobile Testing ("login → wajib ganti password → face registration → check-in/check-out") — 3 bagian pertama sudah selesai (Track H/I), check-in/check-out adalah bagian terakhir yang hilang.

Scope dibatasi MURNI ke aksi check-in/check-out. TIDAK termasuk riwayat kehadiran milik karyawan sendiri — API-Contract.md tidak mendefinisikan endpoint GET riwayat untuk role KARYAWAN (endpoint riwayat yang ada, `/attendance/summary` & `/attendance/attempts`, keduanya scoped HR_ADMIN). Kalau requirement ini muncul nanti, itu task terpisah (backend + mobile), bukan bagian task ini.

## Requirement

1. Tab "Absensi" (`src/app/(karyawan)/absensi.tsx`) jadi entry point utama — render status jadwal hari ini (reuse data dari `GET /schedules/today` yang sudah ada di `schedule.service.ts`) dan tombol aksi sesuai `statusKehadiran`:
   - `BELUM_CHECKIN` → tombol "Check-in"
   - `SUDAH_CHECKIN` → tombol "Check-out"
   - `SELESAI` → state selesai, tanpa tombol aksi
2. `attendance.service.ts` baru — fungsi `checkIn(jadwalId, latitude, longitude, foto)` dan `checkOut(...)`, POST `multipart/form-data` sesuai kontrak (field: `jadwalId`, `latitude`, `longitude`, `foto`).
3. Flow capture kamera — reuse POLA dari face-registration (Track I: oval overlay, capture → preview → confirm), tapi screen/komponen TERPISAH (bukan re-route ke flow face-registration, karena tujuan submit-nya beda).
4. Sebelum submit: capture lokasi GPS (`expo-location`). WAJIB minta izin runtime, handle penolakan izin secara graceful (tampilkan pesan minta izin, bukan crash/silent fail/tombol yang gak jelas kenapa gak jalan).
5. Response handling WAJIB membedakan 3 kasus eksplisit (bukan cuma cek HTTP status):
   - `hasilVerifikasi === 'VALID'` (HTTP 200) → screen sukses, tampilkan waktu, tombol kembali ke Beranda/Absensi.
   - `hasilVerifikasi !== 'VALID'` tapi tetap HTTP 200 (`GAGAL_LOKASI`, `DI_LUAR_JENDELA_WAKTU`, dan secara skema juga `GAGAL_WAJAH`/`GAGAL_LIVENESS` meski gak akan ter-trigger asli selama bypass aktif) → screen gagal dengan pesan dari field `pesan`, tombol coba lagi.
   - HTTP error 400/404/409 (`SUDAH_CHECKIN`, `SUDAH_CHECKOUT`, `WAJAH_BELUM_TERDAFTAR`, `JADWAL_TIDAK_DITEMUKAN`) → error handling generik (toast/alert). Secara teori jarang terjadi karena user sudah di-gate lewat state dari `GET /schedules/today`, tapi WAJIB tetap ditangani, bukan diasumsikan tidak akan terjadi.
6. Timeout HTTP 60 detik untuk request check-in/check-out — konsisten dengan pola face-registration Track I (AGENTS.md: panggilan yang berpotensi lambat wajib set timeout eksplisit). Ini disiapkan untuk kondisi setelah RAM di-upgrade dan bypass dicabut (sudah direncanakan di roadmap) — meski saat ini responsenya cepat karena bypass aktif.
7. Loading state eksplisit selama submit (spinner/disable tombol).

## Skema/struktur data

Tidak ada perubahan `schema.prisma` (backend sudah selesai, Track C). Tambahan di sisi mobile: type response check-in/check-out di `src/types/` mengikuti bentuk di `API-Contract.md` §5, termasuk union type untuk 2 bentuk response sukses (`{ logId, waktuCheckIn/Out, hasilVerifikasi: 'VALID' }`) vs gagal-terkontrol (`{ hasilVerifikasi, pesan }`).

## Edge case yang perlu dihandle

- Izin lokasi ditolak user → tampilkan state minta izin, jangan biarkan tombol submit aktif tanpa lokasi valid.
- GPS accuracy rendah/gagal dapat koordinat → tangani sebagai error state terpisah dari `GAGAL_LOKASI` (yang itu server-side, radius check) — jangan disamakan pesannya, supaya user tau bedanya "device gak dapat lokasi" vs "lokasi kamu di luar radius site".
- Submit ganda (double-tap tombol check-in) → tombol WAJIB disabled begitu loading state aktif, mencegah 2 request bersamaan (berpotensi race ke `SUDAH_CHECKIN`).
- Response gagal-terkontrol maupun error hard HARUS tetap mengizinkan user retry tanpa perlu keluar/masuk ulang ke flow dari awal (kecuali kasus yang emang butuh capture ulang, mis. GAGAL_LOKASI mungkin cuma butuh submit ulang tanpa re-capture foto — ini keputusan UX yang bisa diputuskan Antigravity dengan alasan, dicatat di done.md kalau menyimpang dari asumsi awal).

## Testing

Sesuai AGENTS.md Mobile Testing:

- Unit/component test WAJIB: handling `hasilVerifikasi` (VALID/GAGAL_LOKASI/DI_LUAR_JENDELA_WAKTU/GAGAL_WAJAH/GAGAL_LIVENESS — 2 terakhir cuma bisa divalidasi via MOCK karena gak bisa ter-trigger asli selama `SKIP_FACE_VERIFICATION=true`, WAJIB dicatat jelas di test description bahwa ini mocked scenario, bukan diasumsikan sudah tercover E2E).
- Unit/component test WAJIB: validasi izin lokasi (granted/denied handling).
- E2E Maestro: tambahkan langkah check-in ke flow inti yang sudah ada (login → wajib ganti password → face registration → **check-in**) — cuma bisa cover skenario `VALID` (karena bypass aktif), sesuai keterbatasan yang sudah diketahui.

## Kriteria selesai

- Semua requirement di atas terimplementasi, dipecah per-layar/komponen sesuai AGENTS.md §3.2 (mobile: 1 layar/komponen per langkah kerja).
- Semua test di atas lolos.
- Verifikasi visual: HANYA screen pertama yang menetapkan referensi visual baru di fitur ini yang wajib screenshot per-tahap (AGENTS.md §10) — kemungkinan besar screen capture kamera attendance, karena ini pola visual baru (beda konteks dari face-registration meski reuse pola). Screen lain cukup laporan tekstual.
- Flow E2E inti (login → ganti password → face registration → check-in) berhasil dijalankan end-to-end secara manual oleh user.
