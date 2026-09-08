# AGENTS.md — Aplikasi Absensi Karyawan Outsourcing

Instruksi kerja untuk AI coding agent (Antigravity). Dibaca otomatis sebelum melakukan perubahan apapun di project ini.

## 1. Dokumen Acuan (source of truth — WAJIB dibaca sebelum implementasi)

- `docs/PRD-aplikasi-absensi.md` — problem, aktor, pain point, requirement, MVP scope
- `docs/TDD.md` — arsitektur sistem, ringkasan keputusan ERD, ringkasan API contract
- `docs/API-Contract.md` — kontrak endpoint lengkap (request/response, validasi)
- `apps/backend/prisma/schema.prisma` — skema database final
- `docs/DESIGN.md` — design system

**Dokumen di atas TIDAK BOLEH diubah oleh agent.** Itu hasil proses discovery yang sudah difinalisasi terpisah. Kalau implementasi butuh sesuatu yang tidak ada di dokumen ini — STOP, tanya ke user. Jangan berimprovisasi menambah atau mengubah requirement sendiri.

## 2. Tech Stack

| Layer           | Teknologi                                            |
| --------------- | ---------------------------------------------------- |
| Mobile          | React Native (Expo)                                  |
| Backend         | NestJS + Prisma                                      |
| Database        | PostgreSQL                                           |
| Face processing | Python + DeepFace (microservice terpisah, stateless) |
| Email           | Resend                                               |

### 2.1 Mobile Stack Detail
- Navigasi: Expo Router (file-based, route groups per role: (auth)/(karyawan)/(supervisor)/(hr-admin))
- Data fetching/server-state: TanStack Query
- Client state: Zustand (auth token, role, wajibGantiPassword, wajahTerdaftar)
- Storage token: expo-secure-store (JANGAN AsyncStorage biasa — token gak boleh plaintext)
- HTTP client: axios, 1 instance terpusat di services/, interceptor attach
  Authorization Bearer + handle 401 (auto-logout + redirect ke (auth))

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

- **Backend (NestJS):** Setiap endpoint/service backend yang selesai di 1 langkah wajib disertai test Jest untuk skenario yang disebutkan di rencana langkah tersebut — bukan sekadar boilerplate `should be defined` bawaan `nest generate resource`, tapi test yang benar-benar meng-assert behavior (mis. `GAGAL_LOKASI`, `GAGAL_LIVENESS`, `DI_LUAR_JENDELA_WAKTU`).
- **Mobile (React Native):** Unit/component test WAJIB untuk logic kritis: validasi form, gate wajibGantiPassword/wajahTerdaftar, hasil verifikasi check-in/out — pakai Jest + React Native Testing Library. Tidak wajib coverage penuh tiap komponen kosmetik. E2E test ditunda pada fase ini untuk menjaga kecepatan dan kepraktisan demo.
- **Test Scope:** Test scope default per-tahap cukup domain-scoped (`npm run test -- src/modules/X`). WAJIB menjalankan FULL suite (`npm run test`, tanpa scope) kalau: (a) tahap itu mengubah file `common/` atau apapun yang dipakai lintas-module (guard, interceptor, filter, strategy, main.ts); atau (b) sebelum 1 Track resmi ditutup (sebelum entry `done.md` gabungan ditulis).
- **Kebijakan Retry:** Kalau ada test gagal, boleh coba perbaiki maksimal **2x percobaan**. Kalau masih gagal setelah 2x — STOP. Laporkan ke user: test mana yang gagal, pesan error, dugaan penyebab. Jangan lanjut ke langkah berikutnya, jangan update `done.md`.

## 6. Update done.md

Setelah 1 langkah kecil selesai, test (jika ada) lolos, DAN user sudah approve hasil langkah itu — tambahkan entry ke `docs/done.md` dengan mencantumkan ringkasan modul, file yang diubah, dan catatan teknis/penyimpangan jika ada.

## 7. Konvensi Kode

- Path API: Bahasa Inggris, plural noun (`/schedules`, `/leave-requests`) — ikuti `API-Contract.md` persis
- Field JSON/nama variabel domain bisnis: Bahasa Indonesia (`jadwalId`, `karyawanId`, `hasilVerifikasi`) — konsisten dengan seluruh dokumen desain
- Istilah teknis generik: Bahasa Inggris (`accessToken`, `requestId`, `success`)
- Response envelope WAJIB ikut format di `API-Contract.md` (`{ success, data/error, meta }`). Controller WAJIB me-return data mentah dari service — JANGAN bungkus manual `{ success, data }`, itu tugas `ResponseInterceptor` global. Membungkus manual di controller menghasilkan regresi double-wrap (`data.data.id` yang pernah terjadi di Schedules).
- Validasi statusAktif bukan cuma soal login. `JwtStrategy.validate()` WAJIB selalu cek `user.statusAktif` di setiap request (bukan cuma `!user`), karena method ini jalan di semua endpoint terproteksi, bukan cuma saat login. Kalau ada guard/strategy baru yang menggantikan atau menambah cara autentikasi lain di masa depan, aturan yang sama berlaku — user nonaktif harus ditolak di titik re-validasi manapun, bukan cuma di `POST /auth/login`.
- **Test cleanup WAJIB di-scope ke data yang dibuat test itu sendiri** (track ID atau marker unik) — JANGAN PERNAH `deleteMany({})` tanpa where filter, karena seluruh test suite share 1 database fisik yang sama. Hardcoded ID/UUID di test data WAJIB unik per file, jangan dipakai ulang persis sama di file test lain.
- **Fixture (user/data) yang dipakai bareng di banyak `describe` block WAJIB direset ke state awal** di block yang butuh state itu, ATAU pakai fixture terpisah per block — jangan asumsikan state fixture masih sama seperti waktu dibuat kalau ada block LAIN (bahkan dalam 1 file yang sama) yang mungkin mengubahnya (contoh nyata: test `PATCH /employees/:id` mengubah `statusAktif` user yang di-reuse test `POST /employees` setelahnya, bikin auth gagal duluan sebelum sempat ke-cek role — Stage 15).
- File upload disimpan LOCAL DISK di storage/{domain}/ (bukan cloud storage), nama file {crypto.randomUUID()}{ekstensi_asli}. Validasi tipe & ukuran file WAJIB di level FileInterceptor (limits: { fileSize }) — BUKAN cuma dicek manual setelah file selesai di-buffer ke memory (itu celah DoS yang pernah ketemu di Leave Requests: validasi manual doang gak nyegah buffer kegedean masuk RAM duluan).
- Semua path param :id WAJIB pakai ParseUUIDPipe (@Param('id', ParseUUIDPipe)) — tanpa ini, id bukan-UUID bisa nembus ke Prisma dan jadi 500 gak terkontrol alih-alih 400 yang rapi.
- Untuk endpoint yang scoped ke kepemilikan/cakupan (mis. supervisor cuma boleh akses site yang diawasi): endpoint READ (GET) yang query-nya di luar cakupan caller → silently narrow ke hasil kosong ([]), JANGAN error. Endpoint WRITE (POST/PATCH/DELETE) yang target-nya di luar cakupan caller → WAJIB ditolak eksplisit (403 atau sesuai konteks), JANGAN dibiarkan lolos.
- Hashing password (SEMUA kasus — provisioning karyawan baru, reset password, change password) WAJIB pakai bcrypt dengan 10 salt rounds, konsisten di seluruh project — jangan bikin standar salt rounds baru per fitur.
- Timezone project WAJIB Asia/Jakarta (`process.env.TZ` di-set global di main.ts). Endpoint/service manapun yang parsing atau menyimpan tanggal/jam dari input client WAJIB pakai offset eksplisit `+07:00` (bukan suffix `Z`/UTC), berlaku untuk semua domain, bukan cuma Schedules.
- Konversi/parsing tanggal-jam Asia/Jakarta (+07:00) WAJIB lewat util terpusat di `common/utils/date.util.ts` (getJakartaStartOfDay, combineJakartaDateTime, getJakartaSingleDayRange, getJakartaDateRange, getJakartaTodayStr, formatJakartaDate, formatJakartaTime) — JANGAN reimplementasi manual (string interpolation offset +07:00, atau tambah/kurang milidetik manual) di service manapun. Kalau butuh varian baru yang belum ada di util ini, tambahkan fungsi baru ke util ini, bukan bikin logic lokal terpisah di module masing-masing.
- Untuk operasi yang mengubah STATUS dari satu nilai spesifik ke nilai lain (approve/reject/cancel/dsb) yang berpotensi race condition (lebih dari 1 aktor bisa memproses barengan) — WAJIB pakai `updateMany` dengan kondisi `where: { id, status: <statusSaatIniYangDiharapkan> }` (conditional update), BUKAN `findUnique` lalu `update` terpisah.
- Prinsip pilih 404 vs 403 untuk resource yang scoped: kalau caller TIDAK punya alasan legitimate untuk tahu resource itu eksis sama sekali (mis. supervisor lain di luar cakupannya) → 404 generic, sembunyikan keberadaan data. Kalau caller punya alasan legitimate untuk tahu resource itu eksis tapi tetap tidak berhak memprosesnya (mis. HR_ADMIN yang melihat pengajuan izin bukan-orphaned) → 403 eksplisit dengan error code spesifik.
- **Pola exception handling reaktif Prisma:** Untuk validasi unique constraint (duplikat) atau operasi write (update/delete) pada relasi yang mungkin tidak ada, WAJIB menggunakan pendekatan reaktif dengan menangkap error Prisma (`P2002` untuk duplikat, `P2025` untuk record tidak ditemukan) di dalam blok `try-catch`, BUKAN melakukan query preemptive (`findUnique`) sebelum operasi _write_. Ini menjamin efisiensi query dan mencegah celah _race condition_.
- Panggilan ke face-service (/internal/embed) berpotensi lambat (~30 detik di CPU tanpa GPU) — endpoint pemanggil WAJIB set timeout HTTP yang sesuai (bukan default axios), dan UI pemanggil WAJIB tampilkan loading state eksplisit.

### 7.1 Mobile — Konvensi Folder
- Root source code WAJIB di dalam `src/` (bukan langsung di root project) — `src/app/`, `src/components/`, `src/services/`, `src/store/`, `src/types/`, `src/hooks/`, `src/constants/`. Expo Router auto-detect `src/app` sebagai routing root, jadi ini tidak perlu config tambahan.
- `src/app/` — routing root Expo Router, WAJIB dipecah per route group sesuai role: `(auth)/`, `(karyawan)/`, `(supervisor)/`, `(hr-admin)/`. Screen di luar 4 group ini (mis. langsung di root `app/`) TIDAK diperbolehkan kecuali file konfigurasi routing itu sendiri (`_layout.tsx`).
- `src/screens/<role>/<NamaScreen>.tsx` — 1 file per screen, isi UI & logic screen. `src/app/` cuma berisi file routing (`_layout.tsx`, file route yang re-export dari `screens/`) — jangan taruh logic screen langsung di file route.
- `src/components/` HANYA untuk komponen dipakai >1 screen (bukan tempat semua komponen)
- `src/services/` — API client + fungsi per domain (`auth.service.ts`, dst)
- `src/store/` — Zustand stores
- `src/types/` — response type dari API-Contract.md (`SuccessEnvelope<T>`, `ErrorEnvelope`, dst)
- Boilerplate bawaan template Expo (`explore.tsx`, `themed-text.tsx`, `themed-view.tsx`, `collapsible.tsx`, `animated-icon.tsx`, `hint-row.tsx`, `app-tabs.tsx`, `web-badge.tsx`, `external-link.tsx`, `use-color-scheme.ts`, dst) WAJIB dihapus atau diganti begitu fitur asli mulai dibangun di folder yang sama — jangan dibiarkan menumpuk berdampingan dengan kode asli, supaya tidak ambigu mana kode kerja mana demo.

## 8. Larangan

- JANGAN generate kode untuk item berstatus "Fitur Lanjutan" di PRD kecuali diminta eksplisit
- JANGAN menambah dependency/library baru tanpa menyebutkan alasan & minta konfirmasi dulu
- JANGAN ubah `schema.prisma` tanpa konfirmasi eksplisit — perubahan schema butuh migration dan berdampak ke API contract juga
- JANGAN mengubah isi folder `docs/`

## 9. Keputusan Lintas

- Role-based access pakai @Roles(...) decorator + RolesGuard (common/guards/roles.guard.ts), selalu dipasang setelah JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard).
- **STRICT TYPE-SAFETY (ZERO `any`):** DILARANG KERAS menggunakan tipe `any` (baik eksplisit maupun implisit) saat menulis atau memodifikasi kode.
  - Gunakan tipe bawaan Prisma (`User`, `Site`, dll).
  - Gunakan tipe _Generic_ (`<T>`) untuk membuat fungsi/interceptor yang dinamis.
  - Jika struktur data benar-benar tidak diketahui, gunakan `unknown` lalu lakukan pengecekan tipe (_type narrowing/type guarding_).
  - Untuk file test (`*.spec.ts`), pantang menggunakan `res.body.data: any`. Selalu _cast_ respons menggunakan `SuccessEnvelope<T>` atau `ErrorEnvelope`.
  - Pengecualian pada linter `unbound-method` untuk pengujian (karena penggunaan mock pada `expect(method)`) kini sudah difasilitasi aman oleh konfigurasi global `eslint-plugin-jest`.
- **GIT STATUS:** Setiap kali _user_ meminta untuk membuat/menyediakan pesan _commit_, Agent **WAJIB** menjalankan perintah `git status` terlebih dahulu untuk melihat kondisi git sebelum memberikan pesan _commit_-nya.
- Development client: Expo Go untuk MVP awal. WAJIB pindah ke custom dev build (expo prebuild / eas build --profile development) begitu mulai kerjakan fitur yang butuh: push notification (expo-notifications, remote push tidak didukung Expo Go), atau background location. Kamera (face registration/attendance) TETAP kompatibel Expo Go, tidak perlu dev build untuk itu.
- **BYPASS SEMENTARA VERIFIKASI WAJAH (TECHNICAL DEBT — Target Hapus: Setelah upgrade RAM dev ke 24 GB):** `SKIP_FACE_VERIFICATION=true` di `apps/backend/.env`. `FaceVerificationService.embedFace()` langsung mengembalikan dummy embedding `[0.1, 0.2, 0.3]` dan `isLive: true` tanpa memanggil Python `face-service`. Dibuat karena keterbatasan RAM dev (12 GB) yang memicu HTTP timeout pada pemrosesan DeepFace di mobile client. Wajib dihapus setelah RAM di-upgrade ke 24 GB.

## 10. Mobile — Design Reference

- `docs/DESIGN.md` adalah titik AWAL (konsep dasar: nuansa warna, tipografi, prinsip "flat, aksen kuning selektif") — BUKAN spec kaku yang wajib diikuti persis nilainya. Boleh diimprove/ditafsir ulang secara visual (hex, spacing eksak, radius, komposisi layout) selama TIDAK mengubah pemetaan semantik di bawah.
- **WAJIB tetap konsisten (non-negotiable, beda dari sekadar "selera"):** pemetaan warna status → makna, mengikuti enum HasilVerifikasi/status dashboard (persis seperti tabel "Warna Semantik — Status Kehadiran" di DESIGN.md): Hadir/Valid = warna sukses, Terlambat = warna warning, Izin = warna info, Belum = warna muted, Tidak Hadir = warna destructive. Nilai HEX spesifiknya boleh diubah, tapi maknanya (warna hijau-ish utk sukses, dst) tidak boleh ditukar-tukar, dan HARUS konsisten di semua role (Karyawan/Supervisor/HR_ADMIN melihat warna yang sama utk status yang sama).
- **Screen pertama yang dibangun di tiap fitur besar (mis. layar Login di auth-mobile) jadi REFERENSI VISUAL yang dikunci** setelah di-approve user — screen-screen berikutnya WAJIB konsisten ke situ (warna aksen, tipografi, radius, spacing yang dipakai), bukan menafsir ulang dari DESIGN.md dari nol tiap kali. Ini mencegah drift visual antar sesi Antigravity yang tidak punya memori bersama.
- Penyimpangan/interpretasi ulang dari DESIGN.md WAJIB dicatat di entry done.md (sama seperti aturan penyimpangan teknis lain, AGENTS.md §4).
- File `code.html` per screen di docs/<role>/<nama_screen>/ HANYA starting point layout/struktur (hasil auto-generate Stitch) — WAJIB diimprove, BUKAN dipertahankan persis. Jangan copy-paste struktur HTML mentah jadi JSX tanpa evaluasi ulang (spacing, hierarki, aksesibilitas mobile).

## 11. Kebijakan Verifikasi Visual (Screenshot)

- Screenshot/verifikasi visual manual HANYA diminta 1x per fitur (di akhir, setelah semua tahap fitur itu selesai) — BUKAN di setiap tahap kecil. Testing otomatis (tsc --noEmit, Jest) tetap wajib di setiap tahap sesuai §5, tapi review visual manual oleh user cukup sekali di titik fitur dianggap selesai secara fungsional.
- Pengecualian: screenshot per-tahap boleh diminta HANYA kalau tahap itu menetapkan referensi visual baru yang akan dikunci (contoh: screen pertama sebuah fitur besar, sesuai § Design Reference), atau kalau ada perubahan visual signifikan yang perlu dikonfirmasi sebelum tahap-tahap berikutnya melanjutkan pola yang sama.
- Di luar 2 kondisi itu, laporan tahap cukup: file yang diubah, hasil test otomatis, cara verifikasi singkat (boleh tekstual, tidak wajib screenshot).

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **absensi-karyawan-outsourcing** (1837 symbols, 4377 relationships, 86 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/absensi-karyawan-outsourcing/context` | Codebase overview, check index freshness |
| `gitnexus://repo/absensi-karyawan-outsourcing/clusters` | All functional areas |
| `gitnexus://repo/absensi-karyawan-outsourcing/processes` | All execution flows |
| `gitnexus://repo/absensi-karyawan-outsourcing/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
