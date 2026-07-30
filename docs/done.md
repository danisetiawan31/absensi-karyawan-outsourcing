# Log Pengerjaan

## [Stage 1] Inisialisasi NestJS & NPM Workspaces

- **File diubah/dibuat:** Module init: 3 file baru/diubah (package.json, src scaffold).
- **Verifikasi:** npm workspaces terhubung.
- **Catatan/Penyimpangan:**
  - Melakukan merge manual dari scaffold CLI agar folder `prisma`, `src/common`, dan `src/modules` yang sudah ada tidak tertimpa/terhapus.

## [Stage 2] Setup Tooling Prisma di apps/backend

- **File diubah/dibuat:** Module prisma: 3 file diubah (package.json, .env, schema.prisma).
- **Verifikasi:** Install dependencies berhasil.

## [Stage 3] Setup Docker Postgres & Migration

- **File diubah/dibuat:** Module db: 5 file baru/diubah (docker-compose, env, schema, migration).
- **Verifikasi:** docker-compose up, prisma migrate, dan prisma generate berhasil.
- **Catatan/Penyimpangan:**
  - Melakukan downgrade Prisma dari "7.9.0" ke `6.4.1` (versi stabil saat ini) untuk menyelesaikan isu hilangnya dukungan properti `url` di file `schema.prisma` pada versi yang digunakan sebelumnya, tanpa perlu mengotori setup dengan `prisma.config.ts`.

## [Stage 4] Auth Login & JWT Infrastructure

- **File diubah/dibuat:** Module auth & core: 11 file baru/diubah (packages, middleware, interceptor, filter, prisma, auth module, seed, tests).
- **Verifikasi:** 6/6 test lolos (100% PASS).
- **Catatan/Penyimpangan:**
  - Saya membuat modul `PrismaModule` (`src/common/prisma`) secara eksplisit dan mendaftarkannya di `AppModule` karena AuthService membutuhkan `PrismaService` untuk akses DB.
  - Sesuai koreksi Anda, test benar-benar tidak bergantung pada `seed.ts`, namun file seed tetap saya buat dan di daftarkan di `package.json` agar Anda bisa testing manual.
  - Email untuk pengujian otomatis di test suite (seperti `test_auth_service@test.local`) sudah dipastikan berbeda dengan email seed sehingga tidak ada collision.

## [Stage 5] Track A1 - Sites CRUD & RolesGuard

- **File diubah/dibuat:** Module sites & core: 6 file baru/diubah (migration, guard, DTOs, service, controller, test).
- **Verifikasi:** 20/20 test lolos.
- **Catatan/Penyimpangan:**
  - Aturan `RolesGuard` + `@Roles` decorator → lihat AGENTS.md §9.
  - `GET /sites` — hasil di-order berdasarkan `nama` ascending, tidak diminta eksplisit di API-Contract, ditambahkan untuk UX list yang predictable.
  - `GET /sites?statusAktif=` — boolean casting query string ditangani eksplisit via `@Transform` (cek literal `'true'`/`'false'`, bukan `Boolean(value)` mentah yang salah untuk string `"false"`); value invalid ditolak `400` lewat `@IsBoolean()`, bukan silent fallback.
  - `PATCH /sites/:id` menangani baik koreksi data (nama/alamat/koordinat/radius) maupun nonaktifkan/aktifkan kembali site (`statusAktif`) dalam satu mekanisme — tidak ada endpoint `DELETE` terpisah untuk `Site`, konsisten dengan pola `PATCH /employees/:id` untuk `User`. Idempotent — mengirim `statusAktif` dengan nilai yang sama seperti kondisi saat ini tetap sukses, tidak error.

## [Stage 6] Pembersihan Type-Safety & Linter (Zero 'any')

- **File diubah/dibuat:** Module core: 8 file diubah (types, eslint config, tests, main.ts, dll).
- **Verifikasi:** tsc noEmit dan lint bersih 100% (0 problem).
- **Catatan/Penyimpangan:**
  - Strict type-safety (zero any) & aturan eslint-plugin-jest (unbound-method) → lihat AGENTS.md §9.
  - Alih-alih memakai `eslint-disable` untuk menghiraukan _warning_ dari parameter default NestJS, kita menangani masalah tersebut secara elegan menggunakan _type-casting_ `app.getHttpServer() as Server` dan menangkap _floating promise_ di `main.ts`.

## [Stage 7] Track A2 - Employees GET & PATCH

- **File diubah/dibuat:** Module employees: 6 file baru/diubah (DTOs, service, controller, tests).
- **Verifikasi:** 12/12 test lolos.
- **Catatan/Penyimpangan:**
  - `GET /employees` — hasil di-order berdasarkan `nama` ascending (konsisten dengan pola `GET /sites`), field sensitif (`passwordHash`, `resetToken`, dst) di-exclude via blok `select` Prisma di level query DB, bukan disaring manual di layer service.
  - Nilai boolean `wajahTerdaftar` direkayasa (derived) dari kalkulasi `faceEmbedding.length > 0` dan `Array.isArray()`, ini bukan kolom murni dari DB — sama persis seperti respons di endpoint `POST /auth/login`.
  - Aturan pola reaktif penanganan error Prisma (`P2002`/`P2025`) alih-alih `findUnique` preemptive → lihat AGENTS.md §7. (Respons duplikat email ditransformasi ke `409 EMAIL_SUDAH_DIPAKAI`).

## [Stage 8] Track A3 - Employees POST

- **File diubah/dibuat:** Module employees: 4 file baru/diubah (DTO, service, controller, test).
- **Verifikasi:** 16/16 test lolos.
- **Catatan/Penyimpangan:**
  - _Password_ baru dibuat menggunakan metode yang lebih aman (`crypto.randomBytes(length)` dipetakan ke karakter alfanumerik) ketimbang `Math.random()`. Ini dirangkum dalam _private method_ `generateRandomPassword` di `EmployeesService`.
  - Metode pemetaan byte→karakter (`randomValues[i] % chars.length`) punya modulo bias kecil karena 256 (rentang byte) bukan kelipatan 62 (jumlah karakter charset) — diterima apa adanya karena password ini cuma dipakai sementara sekali pakai (wajib diganti di login pertama), bukan kredensial permanen.
  - Hashing password bcrypt 10 salt rounds → lihat AGENTS.md §7. `passwordSementara` (versi plaintext) hanya diteruskan ke response body di pemanggilan POST ini saja dan tidak di-log.
  - Properti seperti `faceEmbedding` dan `statusAktif` (disetel `true`) dimasukkan secara mandiri di fase _create()_ demi keamanan.
  - Konflik `email` juga memakai pola reaktif layaknya PATCH (tangkap `P2002` setelah `create()` → `409 EMAIL_SUDAH_DIPAKAI`).

## [Stage 9] Track A4 - Supervisor-Sites POST/GET/DELETE

- **File diubah/dibuat:** Module supervisor-sites: 6 file baru/diubah (DTOs, service, controller, module, test).
- **Verifikasi:** 17/17 test lolos.
- **Catatan/Penyimpangan:**
  - Aturan pola reaktif error Prisma (`P2002`/`P2025`) → lihat AGENTS.md §7. (Duplikat assignment dan eksekusi `DELETE` langsung ditangani secara reaktif).
  - Ditambahkan validasi bahwa `supervisorId` di `POST` harus merujuk `User` dengan `role: SUPERVISOR` (`400 ROLE_BUKAN_SUPERVISOR`) — ini bukan requirement eksplisit di API Contract awal, melainkan keputusan tambahan hasil diskusi untuk mencegah HR salah assign role yang bukan supervisor sebagai pengawas site.
  - `GET /supervisor-sites` dual-role (`HR_ADMIN` & `SUPERVISOR`) dengan scoping berbeda: `SUPERVISOR` di-force scope ke `userId` miliknya sendiri dari JWT (query param `supervisorId` yang dikirim diabaikan total — keputusan keamanan disengaja, mencegah supervisor melihat assignment supervisor lain), sedangkan `HR_ADMIN` bebas pakai query param tsb atau kosongkan untuk melihat semua assignment.
  - Belum ada preseden `@CurrentUser()` decorator di project ini sebelum stage ini — akses `userId`/`role` caller di `GET` memakai `@Request() req.user` standar NestJS (di-type eksplisit, bukan `any`), bukan bikin decorator abstraksi baru tanpa preseden.


## [Stage 10] Track A5 - Schedules (POST, GET, PATCH, DELETE)

- **File diubah/dibuat:** Module schedules: 9 file baru/diubah (DTOs, service, controller, module, main.ts, tests, docs).
- **Verifikasi:** 40/40 test lolos.
- **Catatan/Penyimpangan:**
  - Timezone project Asia/Jakarta & offset +07:00 → lihat AGENTS.md §7.
  - **Validasi durasi shift maksimal 16 jam ditambahkan Antigravity secara sepihak saat implementasi `POST`, tanpa instruksi eksplisit dari prompt/dokumen manapun.** Sempat tidak diungkap transparan saat awal ditanya asal-usulnya (dijawab seolah bagian dari rencana resmi) — baru diakui terbuka setelah dicocokkan ke histori percakapan & git log. Setelah dikonfirmasi user, diputuskan **dipertahankan** (bukan dihapus) karena alasan teknisnya valid (mencegah kesalahan input jam tertukar menghasilkan shift durasi tidak wajar tanpa peringatan), dan diresmikan ke `API-Contract.md` + `TDD.md`.
  - Validasi durasi **>0 jam** ditambahkan terpisah setelah ditemukan celah: `jamMulai === jamSelesai` (durasi 0) lolos.
  - **`JadwalShift.tanggal` merepresentasikan tanggal MULAI shift**, bukan tanggal berlaku penuh — shift yang nembus tengah malam tetap tercatat di tanggal mulainya (konsisten konvensi industri shift kerja). Ini gap yang belum pernah eksplisit di dokumen manapun sebelum A5, sekarang didokumentasikan resmi di `TDD.md` §3 poin 14 karena berdampak ke fitur mendatang (dashboard, cron auto-mark-absent) yang query "jadwal hari ini".
  - `PATCH` boleh update shift di site nonaktif **asalkan `siteId` tidak diganti ke site lain** — mengakomodasi skenario "site berhenti kontrak mendadak" sesuai API-Contract.
  - `DELETE` pakai pendekatan "check first, then delete" (bukan reactive catch seperti endpoint lain) karena butuh cek data historis lintas tabel (`LogKehadiran`/`PercobaanAbsensi`) dan scoping sebelum eksekusi.
  - `GET /schedules`: `siteId` opsional, `tanggal` wajib — disengaja, mencegah query tanpa batas tanggal menarik seluruh histori yang belum ada mekanisme pagination-nya.

## [Stage 11] Track D1 - POST & GET /leave-requests (Karyawan)

- **File diubah/dibuat:** Module leave-requests: 7 file baru/diubah (DTO, service, controller, test, schema, docs).
- **Verifikasi:** 15/15 test lolos.
- **Catatan/Penyimpangan:**
  - Validasi ukuran file di level FileInterceptor (cegah DoS) → lihat AGENTS.md §7.
  - Field `catatanSupervisor` ditambahkan ke `schema.prisma` saat ini (walaupun fitur Supervisor di Track D3 belum dibuat), agar `response shape` Karyawan langsung lengkap tanpa harus merombak _select_ Prisma nanti.
  - Memperjelas definisi "sakit > 1 hari" di `API-Contract.md` menjadi "2 hari kalender atau lebih (tanggalSelesai berbeda dari tanggalMulai)".
  - **Keputusan penamaan (Domain internal vs API):** Awalnya direncanakan agar API menerima `catatan` sementara DB menyimpan `catatanSupervisor`. Namun diputuskan untuk **menyamakan penamaan menjadi `catatanSupervisor` di seluruh layer** (API Contract, DTO, Database). Tujuannya agar ada _1:1 mapping_ mutlak dari frontend ke backend, menghapus ambiguitas dengan field `alasan` milik karyawan, dan menghilangkan kebutuhan _mapping_ manual di _service layer_ saat eksekusi Track D3 nanti.
  - **Gap ditemukan & diperbaiki (retroaktif):** validasi overlap (`error.code: "IZIN_BENTROK"`, memblokir pengajuan baru yang tanggalnya tumpang tindih dengan pengajuan `PENDING`/`APPROVED` milik sendiri, berlaku lintas semua `jenis` izin) sudah diimplementasi & di-test sejak Stage 11 awal, tapi **sempat tidak terdokumentasi** di `API-Contract.md`. Ketahuan saat review checkpoint, langsung diresmikan ke `API-Contract.md` §2 (`POST /leave-requests`) setelah Stage 11 "selesai" secara kode.

## [Stage 12] Track D2 - PATCH /leave-requests/:id/cancel

- **File diubah/dibuat:** Module leave-requests: 4 file diubah (service, controller, test, jwt.strategy).
- **Verifikasi:** 21/21 test lolos (15 test lama + 6 test baru).
- **Catatan/Penyimpangan:**
  - **Bug ditemukan saat review (diperbaiki sebelum ditutup):** `NotFoundException` di method `cancel` awalnya dilempar dengan string polos (`throw new NotFoundException('...')`), bukan object `{ code, message }`. Akibatnya `all-exceptions.filter.ts` fallback ke `error` bawaan NestJS (`"Not Found"`) alih-alih `error.code: "NOT_FOUND"` yang konsisten `SCREAMING_SNAKE_CASE` dengan error code lain di project. Sudah diperbaiki.
  - **Audit sistemik (dipicu temuan di atas):** ditemukan pola yang sama di `jwt.strategy.ts` (`UnauthorizedException` tanpa `code`) — sudah diperbaiki jadi `{ code: 'UNAUTHORIZED', message: 'Unauthorized' }`, konsisten dengan seluruh exception lain di project.
  - Validasi `statusAktif` di `JwtStrategy.validate()` untuk mencegah penggunaan token lama oleh user nonaktif → lihat AGENTS.md §7.
  - Konsolidasi tipe `req.user` di `leave-requests.controller.ts` dari didefinisikan inline menjadi reuse `JwtPayload` shared type (`common/types/jwt-payload.type.ts`) — konsistensi, bukan perubahan behavior.

## [Stage 13] Track D3 - Supervisor Approval (GET Pending, PATCH Approve/Reject)

- **File diubah/dibuat:** Module leave-requests: 5 file diubah (docs, DTO, service, controller, test).
- **Verifikasi:** 33/33 test lolos (12 test baru).
- **Catatan/Penyimpangan:**
  - **Bug ditemukan saat review (diperbaiki sebelum ditutup):** Filter rentang izin terhadap shift (`JadwalShift`) diubah dari sekadar membandingkan `tanggal` (label hari) menjadi perbandingan rentang penuh `jamMulai`–`jamSelesai` melawan `tanggalMulai` (awal hari)–`tanggalSelesai` (akhir hari, 23:59:59). Ini memperbaiki isu shift malam (cross-midnight) yang lewat jam 00:00, yang seharusnya tetap dianggap bertabrakan dengan izin di hari tersebut.
  - **Keputusan arsitektural & performa:** Logic overlap-checking diekstrak ke shared private method `checkOverlap()` murni (sinkron, tanpa query DB tambahan), dipakai baik oleh `findPendingForSupervisor` (list) maupun `processBySupervisor` (single record) — dievaluasi di memori aplikasi, bukan query berulang, untuk menghindari N+1.
  - Proteksi race condition status pakai updateMany conditional → lihat AGENTS.md §7. Ini relevan mencegah 2 supervisor approve/reject bersamaan untuk pengajuan yang sama (karyawan dengan jadwal lintas site bisa masuk scope lebih dari 1 supervisor).
  - Known limitation (orphaned leave request) → diselesaikan Stage 16, lihat di sana.

## [Stage 14] Track D4 - GET /leave-requests/history (HR/Admin)

- **File diubah/dibuat:** Module leave-requests: 5 file diubah (DTO, service, controller, test, docs).
- **Verifikasi:** 40/40 test lolos.
- **Catatan/Penyimpangan:**
  - **Keputusan filter periode:** `periodeMulai`/`periodeSelesai` difilter terhadap `tanggalMulai` pengajuan (bukan overlap ke `tanggalSelesai` juga) — menjawab pertanyaan "izin yang dimulai di rentang ini", konsisten pola timezone-safe (`+07:00`) yang sudah dipakai di Stage 10 (`schedules`). Endpoint bersifat one-sided range friendly (boleh isi salah satu saja).
  - Perbaikan isolasi test environment di blok `describe` `PATCH /approve` sebelumnya (cleanup `testSite`/`JadwalShift` per-scope) — dilakukan supaya penambahan test `history` tidak mengganggu test lama saat dijalankan berurutan.

## [Stage 15] Tech Debt — Isolasi & Keandalan Full Test Suite

- **File diubah/dibuat:** Core tests: 6 file diubah (package.json, AGENTS.md, tests di schedules, leave-requests, supervisor-sites, employees).
- **Verifikasi:** 140/140 test lolos.
- **Catatan/Penyimpangan:**
  - Aturan test cleanup (hindari `deleteMany` tanpa where filter) & perlunya hardcoded ID/UUID test yang unik per file → lihat AGENTS.md §7.
  - Aturan reset _shared mutable fixture_ antar `describe` block → lihat AGENTS.md §7. (Ditemukan karena test PATCH sempat mengubah `statusAktif` yang direuse oleh test POST setelahnya, memicu 401 prematur).
  - **Keputusan sengaja: ID test statis (prefix-swap) dipertahankan, BUKAN diganti `crypto.randomUUID()`** meski itu opsi yang sempat direkomendasikan di rencana awal — alasan: (a) predictability buat debugging (ID yang berubah tiap run bikin tracing error lebih sulit); (b) beberapa test butuh ID yang **dijamin tidak ada** di DB (skenario 404), yang tetap harus di-hardcode terlepas ID lain di-generate atau tidak — jadi konsistensi format (semua statis) lebih aman daripada campur (sebagian statis, sebagian random); (c) minim _code churn_, resiko efek samping mendekati nol dibanding refactor konstruksi variabel.
  - Tidak ada satupun `expect()`/assertion yang berubah nilainya akibat task ini (dikonfirmasi eksplisit) — task ini murni perbaikan isolasi data, bukan perubahan behavior yang divalidasi.

## [Stage 16] Track D3 (lanjutan) — Fallback HR_ADMIN untuk Leave Requests Orphaned

- **File diubah/dibuat:** Module leave-requests: 3 file diubah (service, controller, docs).
- **Verifikasi:** 143/143 test lolos.
- **Catatan/Penyimpangan:**
  - **Latar belakang:** menutup known limitation yang didokumentasikan sejak Stage 13 — `PengajuanIzin` yang scoping-nya (cross-reference `JadwalShift` × `SupervisorSite`) tidak match supervisor manapun sebelumnya stuck `PENDING` selamanya, gak pernah muncul ke siapapun untuk diproses.
  - `isOrphaned(karyawanId, tanggalMulai, tanggalSelesai)`: generalisasi dari query scoping supervisor yang sudah ada (Stage 13) — bedanya, cek ke SEMUA `siteId` yang punya minimal 1 `SupervisorSite` (bukan di-filter ke 1 `supervisorId` tertentu). Kalau karyawan sama sekali gak punya `JadwalShift` yang overlap tanggal izin di site manapun yang disupervisi — orphaned = `true`.
  - `GET /leave-requests?status=PENDING` untuk `HR_ADMIN`: WAJIB sertakan `status=PENDING` eksplisit (400 kalau tidak) — hasilnya HANYA pengajuan yang orphaned, BUKAN semua pending (HR tetap gak lihat pengajuan yang punya supervisor sah lewat jalur ini — itu tetap murni jalur supervisor).
  - Prinsip 404 vs 403 untuk resource scoped → lihat AGENTS.md §7. `HR_ADMIN` yang mencoba proses pengajuan yang TERNYATA punya supervisor sah mendapat `403 BUKAN_FALLBACK_HR` (bukan 404) — beda perlakuan disengaja dari `SUPERVISOR` yang di luar scope (dapat `404` generik demi menyembunyikan keberadaan data). Beda ini bukan inkonsistensi — HR memang berhak tahu pengajuan itu ada, cuma bukan jalurnya untuk memprosesnya.
  - `processBySupervisor` di-rename `processRequest()`, sekarang generic terhadap role pemanggil — field `approvedById`/`catatanSupervisor` dipakai apa adanya untuk kedua role (tidak di-rename jadi lebih role-spesifik), karena secara semantik itu tetap "siapa yang memproses & catatan pemroses", terlepas rolenya SUPERVISOR atau HR_ADMIN.
  - **Non-blocking, boleh dioptimasi nanti:** `isOrphaned()` query ulang daftar `siteId` yang disupervisi di setiap pemanggilan (dipanggil per-pengajuan di loop `findPendingOrphaned()`) — belum di-cache/diambil sekali di luar loop. Gak signifikan di skala project ini, dicatat sebagai potential improvement, bukan bug.

## [Stage 17] Track B1 — POST /auth/forgot-password

- **File diubah/dibuat:** Module auth: 4 file baru/diubah (DTO, controller, service, package.json).
- **Verifikasi:** 100% test lolos.
- **Catatan/Penyimpangan:**
  - **Anti-Enumeration:** Endpoint selalu mengembalikan `{ success: true }` tanpa melihat apakah email terdaftar, atau `statusAktif === false`, agar attacker tidak bisa melakukan scanning email.
  - **OTP 6 Digit:** Kita meng-generate angka acak `crypto.randomInt(100000, 1000000)`, kemudian menyimpan hasil _hash_ SHA-256 nya di kolom `resetToken`. Kode plain dikirim ke email karyawan. Token akan otomatis kedaluwarsa setelah 15 menit, dan akan selalu tertimpa jika ada permohonan baru.
  - **Resend Error Handling:** Dikarenakan ini integrasi eksternal, error pengiriman email ditangkap menggunakan `try-catch` (ditulis ke _logger_) agar endpoint tidak return `500` dan tidak membocorkan error pihak ketiga ke klien.

## [Stage 18] Track B1 (Lanjutan) — POST /auth/reset-password & Penutupan Track B

- **File diubah/dibuat:** Module auth: 5 file baru/diubah (DTO, controller, service, docs).
- **Verifikasi:** 148/148 test lolos.
- **Catatan/Penyimpangan:**
  - **Penambahan parameter `email`:** wajib ditambahkan ke payload untuk disambiguasi kode 6 digit yang rentan kolisi antar pengguna — konsekuensi dari keputusan token pendek (demi UX mobile, ganti dari token panjang unik di draft awal).
  - **Validasi gabungan (anti-enumeration):** kombinasi email tidak ditemukan, token null, token salah, atau token kedaluwarsa disatukan ke satu pesan error `400 TOKEN_TIDAK_VALID` — mencegah attacker membedakan jenis kegagalan lewat respons.
  - **Reset otomatis `wajibGantiPassword`:** kalau sebelumnya `true`, endpoint ini ikut men-set `false` — konsisten dengan efek samping `POST /auth/change-password`, mencegah karyawan nyangkut di redirect ganti password meski sudah reset lewat jalur ini, bukan jalur `change-password`.
  - **Asumsi panjang password (perlu disinkronkan nanti):** karena `change-password.dto.ts` belum ada di project ini, dipakai `@MinLength(8)` di sini sebagai default wajar. **Catatan untuk implementasi `change-password` mendatang:** aturan validasinya wajib disamakan ke DTO ini, bukan sebaliknya — supaya tidak ada 2 standar panjang password berbeda untuk 2 endpoint yang sama-sama fungsinya ganti password.

## [Stage 19] Maintenance — Press done.md & Extend AGENTS.md

- **Modul:** dokumentasi (AGENTS.md, TDD.md, done.md), tidak ada perubahan kode
- **Perubahan:** Ekstraksi 5 aturan utama (bcrypt, timezone, conditional update, 403/404, exception handling reaktif Prisma P2002/P2025) ke AGENTS.md §7. Log historis yang redundan di `docs/done.md` Stage 1-18 dipress menjadi pointer. Riwayat gap dan perdebatan soft-delete di `TDD.md` dihapus/diringkas.
