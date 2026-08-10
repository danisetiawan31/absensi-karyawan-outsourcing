# HR Admin — Site & Penugasan Supervisor

## Konteks & tujuan

Tab "Site" — HR Admin kelola lokasi kerja (site): lihat, buat baru, edit (termasuk lokasi geografis via map interaktif), dan kelola penugasan supervisor per site.

## Requirement

1. Dependency baru: react-native-maps (dikonfirmasi sebelumnya — jalan di Expo Go tanpa perlu custom dev build/API key untuk development, API key Google Maps baru dibutuhkan saat build production, itu di luar scope sekarang).
2. sites.service.ts: getSites(statusAktif?), createSite(nama, alamat, latitude, longitude, radiusToleransi?), updateSite(id, partial).
3. Extend supervisor-sites.service.ts (sudah ada dari Track K): createSupervisorSite(supervisorId, siteId), deleteSupervisorSite(id), dan fungsi untuk list assignment per site (reuse getSupervisorSites dengan parameter, atau tambah fungsi baru kalau shape-nya beda untuk keperluan HR — cek dulu apakah query siteId didukung di GET /supervisor-sites, kalau tidak, list assignment per site diturunkan dari list keseluruhan lalu difilter client-side).
4. List screen site: nama, alamat, radiusToleransi, badge statusAktif, jumlah supervisor ter-assign. Tombol "Tambah Site".
5. Form create/edit site:
   - nama, alamat (text input biasa).
   - Map interaktif (react-native-maps): draggable marker untuk pilih latitude/longitude, circle overlay menampilkan radiusToleransi secara visual di sekitar marker.
   - Input numerik latitude/longitude di bawah map — 2 arah: drag marker update angka, edit angka manual geser posisi marker.
   - Input radiusToleransi (angka, meter) — circle overlay di map ikut update reaktif saat nilai ini diubah.
   - Default posisi awal map (mode create): current location device HR Admin via expo-location (sudah terpasang, reuse). Kalau izin lokasi ditolak, fallback ke koordinat default yang masuk akal (mis. pusat kota terdekat dari data project, atau titik netral) — TIDAK boleh crash/blank map.
   - Mode edit: posisi awal dari data existing site.
   - statusAktif toggle (khusus mode edit).
6. Section assign/unassign supervisor (di dalam screen edit site, bukan screen terpisah):
   - List supervisor yang sudah ter-assign ke site ini, tombol hapus per item (ConfirmModal variant='warning' — jelaskan konsekuensi: supervisor tidak akan lagi melihat site ini di dashboard/jadwal-nya).
   - Tombol "Tambah Supervisor": picker dari GET /employees?role=SUPERVISOR (dengan search-by-nama kalau daftar panjang), submit via createSupervisorSite.
   - Handle race ROLE_BUKAN_SUPERVISOR (400) — refetch picker list, pesan jelas (kasus jarang: role user diubah tepat sebelum assignment submit).

## Edge case

- Izin lokasi ditolak saat create site baru → map tetap render dengan fallback default, tidak crash.
- List site kosong → EmptyState.
- Site tanpa supervisor ter-assign → tampilkan state jelas ("Belum ada supervisor"), bukan list kosong yang ambigu.
- ROLE_BUKAN_SUPERVISOR race saat assign → pesan jelas, refetch picker.

## Testing

- Service layer: query params & payload.
- List: badge status, jumlah supervisor.
- Map picker: drag marker update state lat/long (test interaksi map mungkin terbatas di RNTL — cek pendekatan testing yang reasonable untuk komponen native map, kemungkinan besar test logic handler-nya secara terisolasi seperti pola descriptor/processX sebelumnya, bukan render map sungguhan).
- Input numerik 2 arah dengan map (assert perubahan angka mempengaruhi region map yang di-pass ke MapView).
- Assign/unassign supervisor, termasuk race ROLE_BUKAN_SUPERVISOR.

## Kriteria selesai

- Semua requirement terimplementasi, 4 tahap.
- Test lolos.
- Verifikasi manual: buat site baru dengan koordinat asli, assign 1 supervisor, cek dari sisi akun supervisor (spv@test.local) apakah site itu langsung muncul di dashboard-nya.
