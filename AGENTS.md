# AGENTS.md — Aplikasi Absensi Karyawan Outsourcing

Instruksi kerja untuk AI coding agent (Antigravity). Dibaca otomatis sebelum melakukan perubahan apapun di project ini.

## 1. Dokumen Acuan (source of truth — WAJIB dibaca sebelum implementasi)

- `docs/PRD-aplikasi-absensi.md` — problem, aktor, pain point, requirement, MVP scope
- `docs/TDD.md` — arsitektur sistem, ringkasan keputusan ERD, ringkasan API contract
- `docs/API-Contract.md` — kontrak endpoint lengkap (request/response, validasi)
- `apps/backend/prisma/schema.prisma` — skema database final

**Dokumen di atas TIDAK BOLEH diubah oleh agent.** Itu hasil proses discovery yang sudah difinalisasi terpisah. Kalau implementasi butuh sesuatu yang tidak ada di dokumen ini — STOP, tanya ke user. Jangan berimprovisasi menambah atau mengubah requirement sendiri.

## 2. Tech Stack

| Layer           | Teknologi                                            |
| --------------- | ---------------------------------------------------- |
| Mobile          | React Native (Expo)                                  |
| Backend         | NestJS + Prisma                                      |
| Database        | PostgreSQL                                           |
| Face processing | Python + DeepFace (microservice terpisah, stateless) |
| Email           | Resend                                               |

## 3. Prinsip Kerja — ATURAN PALING PENTING DI FILE INI

1. **Selalu rencana dulu, baru eksekusi.** Sebelum menulis kode untuk task apapun, tulis dulu rencana implementasi berupa task list langkah-langkah kecil. Tunggu persetujuan eksplisit dari user sebelum mulai coding.
2. **Satu langkah kecil per iterasi — bukan satu fitur, apalagi semua fitur.** Definisi "langkah kecil":
   - Backend: 1 endpoint + service function pendukungnya (bukan 1 modul penuh, bukan seluruh CRUD sekaligus)
   - Mobile: 1 layar atau 1 komponen (bukan 1 alur/flow penuh dari awal sampai akhir)
   - Schema: 1 migration per perubahan model
3. **Berhenti setelah 1 langkah selesai.** Laporkan: apa yang dikerjakan, file apa yang berubah, cara mengetesnya. Tunggu review/persetujuan user sebelum lanjut ke langkah berikutnya. JANGAN otomatis lanjut tanpa diminta, walaupun "kelihatan jelas" langkah berikutnya apa.
4. **Jangan mengasumsikan requirement yang tidak eksplisit ada di `docs/`.** Ambigu → tanya. Jangan menebak lalu diam-diam mengimplementasikan tebakan itu.
5. **Ikuti urutan dependency logis** — jangan bangun fitur yang bergantung pada fitur lain yang belum ada (mis. jangan bangun layar dashboard sebelum endpoint data pendukungnya selesai & teruji).

## 4. Kebebasan Implementasi

- Poin #4 di atas berlaku untuk **requirement/scope** — itu tidak bisa ditebak, harus eksplisit ada di `docs/` atau dikonfirmasi user.
- Untuk **detail implementasi teknis** (struktur kode, validasi tambahan, pendekatan yang lebih efisien) — boleh berimprovisasi **asal ada benefit konkret** (lebih aman, lebih maintainable, lebih sesuai konvensi NestJS/Prisma).
- Setiap improvisasi/penyimpangan dari rencana awal **wajib dicatat** di entry `done.md` saat langkah itu selesai — bagian "Catatan".
- Kalau penyimpangan itu prinsipnya relevan untuk fitur lain juga (bukan cuma spesifik langkah ini), tambahkan sebagai baris baru di section ini.

## 5. Kebijakan Test & Retry

- Scope test otomatis **hanya untuk backend (NestJS)**. Mobile (Expo/React Native) tidak wajib punya test otomatis di MVP ini.
- Setiap endpoint/service backend yang selesai di 1 langkah wajib disertai test Jest untuk skenario yang disebutkan di rencana langkah tersebut — bukan sekadar boilerplate `should be defined` bawaan `nest generate resource`, tapi test yang benar-benar meng-assert behavior (mis. `GAGAL_LOKASI`, `GAGAL_LIVENESS`, `DI_LUAR_JENDELA_WAKTU`).
- Kalau ada test gagal, boleh coba perbaiki maksimal **2x percobaan**.
- Kalau masih gagal setelah 2x — STOP. Laporkan ke user: test mana yang gagal, pesan error, dugaan penyebab. Jangan lanjut ke langkah berikutnya, jangan update `done.md`.
- Test scope default per-tahap cukup domain-scoped (npm run test -- src/modules/X). WAJIB jalanin FULL suite (npm run test, tanpa scope) kalau: (a) tahap itu mengubah file common/ atau apapun yang dipakai lintas-module (guard, interceptor, filter, strategy, main.ts); atau (b) sebelum 1 Track resmi ditutup (sebelum entry done.md gabungan ditulis).

## 6. Update done.md

Setelah 1 langkah kecil selesai, test (jika ada) lolos, DAN user sudah approve hasil langkah itu — tambahkan entry ke `docs/done.md`:

## 7. Konvensi Kode

- Path API: Bahasa Inggris, plural noun (`/schedules`, `/leave-requests`) — ikuti `API-Contract.md` persis
- Field JSON/nama variabel domain bisnis: Bahasa Indonesia (`jadwalId`, `karyawanId`, `hasilVerifikasi`) — konsisten dengan seluruh dokumen desain
- Istilah teknis generik: Bahasa Inggris (`accessToken`, `requestId`, `success`)
- Response envelope WAJIB ikut format di `API-Contract.md` (`{ success, data/error, meta }`) — jangan bikin format baru
- Validasi statusAktif bukan cuma soal login. `JwtStrategy.validate()` WAJIB selalu cek `user.statusAktif` di setiap request (bukan cuma `!user`), karena method ini jalan di semua endpoint terproteksi, bukan cuma saat login. Kalau ada guard/strategy baru yang menggantikan atau menambah cara autentikasi lain di masa depan, aturan yang sama berlaku — user nonaktif harus ditolak di titik re-validasi manapun, bukan cuma di `POST /auth/login`.
- **Test cleanup WAJIB di-scope ke data yang dibuat test itu sendiri** (track ID atau marker unik) — JANGAN PERNAH `deleteMany({})` tanpa where filter, karena seluruh test suite share 1 database fisik yang sama. Hardcoded ID/UUID di test data WAJIB unik per file, jangan dipakai ulang persis sama di file test lain.
- **Fixture (user/data) yang dipakai bareng di banyak `describe` block WAJIB direset ke state awal** di block yang butuh state itu, ATAU pakai fixture terpisah per block — jangan asumsikan state fixture masih sama seperti waktu dibuat kalau ada block LAIN (bahkan dalam 1 file yang sama) yang mungkin mengubahnya (contoh nyata: test `PATCH /employees/:id` mengubah `statusAktif` user yang di-reuse test `POST /employees` setelahnya, bikin auth gagal duluan sebelum sempat ke-cek role — Stage 15).
- File upload disimpan LOCAL DISK di storage/{domain}/ (bukan cloud storage), nama file {crypto.randomUUID()}{ekstensi_asli}. Validasi tipe & ukuran file WAJIB di level FileInterceptor (limits: { fileSize }) — BUKAN cuma dicek manual setelah file selesai di-buffer ke memory (itu celah DoS yang pernah ketemu di Leave Requests: validasi manual doang gak nyegah buffer kegedean masuk RAM duluan).
- Semua path param :id WAJIB pakai ParseUUIDPipe (@Param('id', ParseUUIDPipe)) — tanpa ini, id bukan-UUID bisa nembus ke Prisma dan jadi 500 gak terkontrol alih-alih 400 yang rapi.
- Untuk endpoint yang scoped ke kepemilikan/cakupan (mis. supervisor cuma boleh akses site yang diawasi): endpoint READ (GET) yang query-nya di luar cakupan caller → silently narrow ke hasil kosong ([]), JANGAN error. Endpoint WRITE (POST/PATCH/DELETE) yang target-nya di luar cakupan caller → WAJIB ditolak eksplisit (403 atau sesuai konteks), JANGAN dibiarkan lolos.

## 8. Larangan

- JANGAN generate kode untuk item berstatus "Fitur Lanjutan" di PRD kecuali diminta eksplisit
- JANGAN menambah dependency/library baru tanpa menyebutkan alasan & minta konfirmasi dulu
- JANGAN ubah `schema.prisma` tanpa konfirmasi eksplisit — perubahan schema butuh migration dan berdampak ke API contract juga
- JANGAN mengubah isi folder `docs/`
- jangan bikin format baru. Controller WAJIB return data mentah dari service — JANGAN bungkus manual {success, data}, itu tugas ResponseInterceptor global. Membungkus manual di controller menghasilkan double-wrap (data.data.id) — pernah jadi regresi nyata di Schedules.

### 9. KEPUTUSAN LINTAS

- Role-based access pakai @Roles(...) decorator + RolesGuard (common/guards/roles.guard.ts), selalu dipasang setelah JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard).
- **STRICT TYPE-SAFETY (ZERO `any`):** DILARANG KERAS menggunakan tipe `any` (baik eksplisit maupun implisit) saat menulis atau memodifikasi kode.
  - Gunakan tipe bawaan Prisma (`User`, `Site`, dll).
  - Gunakan tipe _Generic_ (`<T>`) untuk membuat fungsi/interceptor yang dinamis.
  - Jika struktur data benar-benar tidak diketahui, gunakan `unknown` lalu lakukan pengecekan tipe (_type narrowing/type guarding_).
  - Untuk file test (`*.spec.ts`), pantang menggunakan `res.body.data: any`. Selalu _cast_ respons menggunakan `SuccessEnvelope<T>` atau `ErrorEnvelope`.
  - Pengecualian pada linter `unbound-method` untuk pengujian (karena penggunaan mock pada `expect(method)`) kini sudah difasilitasi aman oleh konfigurasi global `eslint-plugin-jest`.
- **GIT STATUS:** Setiap kali _user_ meminta untuk membuat/menyediakan pesan _commit_, Agent **WAJIB** menjalankan perintah `git status` terlebih dahulu untuk melihat kondisi git sebelum memberikan pesan _commit_-nya.
