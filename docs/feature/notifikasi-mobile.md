# Notifikasi Mobile — Karyawan

## Konteks & tujuan

Item terakhir Track J. Tab "Notifikasi" saat ini placeholder murni. Karyawan bisa lihat riwayat notifikasi (REMINDER_CHECKIN, PERUBAHAN_JADWAL — 2 tipe yang relevan untuk role ini) dan tandai sudah dibaca.

Scope TIDAK termasuk badge unread count di tab navigator (butuh infra prefetch/polling di level layout yang tidak diminta eksplisit) — potential follow-up terpisah, bukan bagian task ini.

## Requirement

1. Tab Notifikasi jadi list screen: fetch GET /notifications (role KARYAWAN, tanpa query param), render array sorted createdAt desc (urutan sudah dari backend).
2. Tiap item tampilkan: pesan, createdAt (format tanggal relatif/absolut konsisten dengan pola yang sudah dipakai di IzinScreen), ikon+aksen warna sesuai tipe (REMINDER_CHECKIN: aksen warning/kuning; PERUBAHAN_JADWAL: aksen info/biru — sesuai yang sudah dikonfirmasi di investigasi awal Track J). Tipe ALERT_SUPERVISOR/PENGAJUAN_IZIN_ORPHANED secara praktik tidak akan muncul untuk role KARYAWAN, tapi komponen tetap harus handle graceful (fallback default) kalau somehow muncul — jangan crash karena tipe tak terduga.
3. Diferensiasi visual read (dibaca=true) vs unread (dibaca=false) — unread lebih menonjol (mis. dot indicator + background sedikit berbeda + teks lebih tebal), read lebih muted.
4. Tap item notifikasi → panggil PATCH /notifications/:id/read, lalu update state item itu jadi dibaca=true (optimistic update ATAU refetch — boleh pilih pendekatan, dicatat di done.md). Idempotent secara alami (baca ulang notifikasi yang sudah dibaca tidak error), tidak perlu guard khusus mencegah tap berulang.
5. Reuse komponen shared yang sudah ada: ScreenHeader, LoadingState/ErrorState/EmptyState, AlertBanner (untuk error mark-as-read kalau gagal, non-blocking — gagal mark-as-read tidak boleh mengganggu tampilan list).

## Skema/struktur data

Tidak ada perubahan schema.prisma (backend Track E sudah selesai). Tambahan mobile: notifications.service.ts (getNotifications, markAsRead) dan types di src/types/ sesuai shape API-Contract.md §7 (tanpa field jadwalId, sudah dikonfirmasi tidak dipublish ke client).

## Edge case yang perlu dihandle

- List kosong → empty state.
- Mark-as-read gagal (network error) → non-blocking, item tetap tampil sebagai unread, tidak block interaksi list lainnya, tampilkan AlertBanner error singkat.
- Tipe notifikasi tak terduga (ALERT_SUPERVISOR/PENGAJUAN_IZIN_ORPHANED muncul di response karyawan, edge case yang seharusnya tidak terjadi tapi harus tetap aman) → fallback ikon/warna default, tidak crash.

## Testing

- Render list dengan berbagai tipe notifikasi → assert ikon/warna sesuai tipe, fallback untuk tipe tak dikenal.
- Render item dibaca=true vs dibaca=false → assert perbedaan visual (testID/style yang bisa diverifikasi).
- Tap item unread → assert markAsRead terpanggil dengan id yang benar, assert state lokal berubah jadi dibaca=true.
- Tap item yang sudah dibaca → assert tidak error (idempotent), boleh tetap memanggil markAsRead atau skip (dicatat pendekatan mana yang dipilih).
- Mark-as-read gagal → assert AlertBanner error muncul, list tidak crash/hilang.
- List kosong → empty state.

## Kriteria selesai

- Semua requirement terimplementasi, dipecah 2 langkah kerja (service layer, lalu list screen) sesuai AGENTS.md §3.2.
- Semua test lolos.
- Verifikasi manual: buka tab Notifikasi, tap notifikasi unread → berubah jadi read, refresh app → state read persisten (dari server, bukan cuma lokal).
