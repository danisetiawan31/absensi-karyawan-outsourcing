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
  - **Panjang password disinkronkan (`@MinLength(8)`):** menggunakan `@MinLength(8)` sebagai standar terpadu (telah disinkronkan ke `ChangePasswordDto` di Stage 35).

## [Stage 19] Maintenance — Press done.md & Extend AGENTS.md

- **Modul:** dokumentasi (AGENTS.md, TDD.md, done.md), tidak ada perubahan kode
- **Perubahan:** Ekstraksi 5 aturan utama (bcrypt, timezone, conditional update, 403/404, exception handling reaktif Prisma P2002/P2025) ke AGENTS.md §7. Log historis yang redundan di `docs/done.md` Stage 1-18 dipress menjadi pointer. Riwayat gap dan perdebatan soft-delete di `TDD.md` dihapus/diringkas.

## [Stage 20] Track C1 — Face Verification Microservice (Python + FastAPI + DeepFace)

- **Selesai:** Endpoint `POST /internal/embed` (ekstraksi wajah & liveness).
- **Catatan & Deviasi:**
  - **Dependency:** Tambahan `tf-keras` (kompatibilitas Keras 3) dan `torch` (wajib untuk modul anti-spoofing FasNet).
  - **Detector:** Beralih ke `mtcnn` (pengganti `opencv` yang crash akibat file XML _haarcascade_ absen di build _headless_).
  - **Latency:** Rata-rata ~30 detik murni di CPU (_mitigasi integrasi sudah dicatat di `AGENTS.md`_).

## [Stage 21] Track C2 — POST /users/me/face-registration

- **Selesai:** Endpoint pendaftaran wajah karyawan via NestJS.
- **File diubah/dibuat:** Module face-verification: controller, service, test suite (1 e2e test file); Module common: filter.
- **Verifikasi:** 157/157 test (Full suite) lolos.
- **Catatan & Deviasi:**
  - **Integrasi Service:** Memanggil `POST /internal/embed` menggunakan Axios dan sukses di-_mock_ menggunakan `jest.spyOn()` pada e2e tests sehingga tidak membebani performa CI/CD.
  - **Exception Flattening:** Bug struktur _exception nested_ di `FaceVerificationService` yang menyebabkan format _error_ tidak terprediksi kini telah diperbaiki agar _flat_ sesuai dengan ekspektasi filter.
  - **Global Exception Filter:** Ditemukan _bug_ pada fallback pesan error HTTP bawaan (seperti `Payload Too Large` dan `Unauthorized`). Telah diatasi di `AllExceptionsFilter` dengan melakukan konversi format teks menggunakan enum `HttpStatus` sehingga secara global _error framework_ kini langsung di-cast ke _SNAKE_CASE_ (contoh: `PAYLOAD_TOO_LARGE`).

## [Stage 22] Track C3 — POST /attendance/check-in & POST /attendance/check-out

- **Selesai:** Endpoint check-in & check-out (verifikasi GPS + wajah + liveness), reuse `FaceVerificationService` (C2) & utilitas Haversine/cosine similarity (dibuat di tahap ini).
- **File dibuat/diubah:** `modules/attendance/*` (DTO, controller, service, spec e2e), `common/utils/geo.util.ts`, `common/utils/vector.util.ts`, `.env.example` (`FACE_MATCH_DISTANCE_THRESHOLD`), `app.module.ts`.
- **Verifikasi:** 184/184 test (Full suite) lolos.
- **Keputusan Desain & Catatan Penting:**
  - **Pemisahan Pipeline vs Precondition:** Hasil _pipeline_ verifikasi (`DI_LUAR_JENDELA_WAKTU`, `GAGAL_LOKASI`, `GAGAL_LIVENESS`, `GAGAL_WAJAH`) direspons sebagai data absensi normal (`success: true`, HTTP 200). Ini secara tegas dibedakan dari _precondition error_ (`JADWAL_TIDAK_DITEMUKAN 404`, `WAJAH_BELUM_TERDAFTAR 400`, `BELUM_CHECKIN 400`, `SUDAH_CHECKIN/SUDAH_CHECKOUT 409`, `FACE_SERVICE_UNAVAILABLE 503`) yang tetap melempar `HttpException` standar. Tabel `PercobaanAbsensi` HANYA dicatat untuk hasil _pipeline_, bukan saat _precondition error_ terjadi.
  - **Race Conditions:** _Check-in_ menggunakan _create_ murni + _catch_ `P2002` untuk _race condition_. _Check-out_ menggunakan _conditional_ `updateMany({ where: { waktuCheckOut: null } })` — perbedaan pendekatan transaksi terjadi karena _check-in_ membuat _row_ baru sedangkan _check-out_ mengubah _row_ _existing_.
  - **Threshold Wajah:** `FACE_MATCH_DISTANCE_THRESHOLD=0.40` menggunakan pendekatan _cosine DISTANCE_ (bukan _similarity_ absolut, sehingga makin kecil makin cocok) sebagai nilai _default_ kalkulasi dari _DeepFace_ model _Facenet_. Bersifat _configurable_ melalui `env` karena tetap butuh _tuning empiris_ pada tingkat operasional (mirip konfigurasi `LIVENESS_CONFIDENCE_THRESHOLD`).
  - **Validasi Koordinat Dini:** Penggunaan eksklusif `@IsLatitude()` dan `@IsLongitude()` pada DTO untuk _blocking_ format _invalid_ lebih awal dan akurat ketimbang sekadar melempar angka _out-of-bounds_ ke dalam _kalkulasi Haversine_ buta.

## [Stage 23] Track E2 & E3 — Background Cron Jobs (Reminder T+5, Alert T+15 & Auto-mark TIDAK_HADIR)

- **Selesai:** Implementasi `AttendanceCronService` (`handleCron` setiap menit) untuk memproses 3 logika: _reminder_ T+5 (ke Karyawan), _alert_ T+15 (ke Supervisor), dan _auto-mark_ absensi `TIDAK_HADIR`.
- **File dibuat/diubah:** `modules/attendance-cron/*` (module, service, spec e2e), `app.module.ts`.
- **Verifikasi:** 204/204 test (Full suite) lolos.
- **Keputusan Desain & Catatan Penting:**
  - **Kondisi T+5 (Karyawan):** `now >= jamMulai + 5 menit` DAN `now < jamSelesai` DAN belum _check-in_.
  - **Kondisi T+15 (Supervisor):** `now >= jamMulai + 15 menit` DAN `now < jamSelesai` DAN belum _check-in_. Dinotifikasikan ke SEMUA Supervisor yang memiliki wewenang pada Site tempat jadwal tersebut, di _de-duplicate_ berbasis `supervisorId` menggunakan `Set` demi efisiensi.
  - **Kondisi Auto-mark:** `now >= jamSelesai` DAN belum memiliki _check-in_ valid.
  - **Proteksi _Race Condition_ Tingkat Tinggi:** Sama sekali tidak menggunakan `findUnique` untuk memeriksa status kehadiran sebelum operasi tulis. Operasi pencatatan `TIDAK_HADIR` dilakukan murni reaktif menggunakan `create` dengan proteksi `try-catch P2002` (jika _row_ baru), dan _conditional update_ `updateMany({ where: { waktuCheckIn: null } })` (jika _row_ lama). Ini 100% menghilangkan risiko menimpa data Karyawan yang _check-in_ sepersekian milidetik saat _cron_ sedang memproses data.
  - **Technical Debt:** Risiko _concurrency antar-tick_ (jika _tick cron_ baru dieksekusi sebelum _tick_ sebelumnya usai) sengaja tidak ditangani melalui _mutex lock_ atau mekanisme serupanya sekarang. Hal ini disepakati untuk diterima di lingkup _MVP_.

## [Stage 24] Track E1 — Endpoint API Notifikasi

- **Selesai:** Implementasi `GET /notifications` dan `PATCH /notifications/:id/read`.
- **File dibuat/diubah:** `modules/notifications/*` (controller, module, service, spec e2e).
- **Verifikasi:** Keseluruhan test (10 e2e tests spesifik E1, total 214 tests suite lengkap) lolos 100%. Linter 100% bersih setelah resolusi _error type resolution_ pada `supertest` dan _envelope typing_.
- **Keputusan Desain & Catatan Penting:**
  - **Security / Scoping:** Endpoint `GET` tidak pernah menerima _userId_ dari _client_/parameter URL, namun 100% menggunakan informasi `userId` dari subjek _JWT payload_ Karyawan atau Supervisor saat ini (`req.user.userId`). Dengan demikian, tidak ada risiko celah _Insecure Direct Object Reference_ (IDOR).
  - **Eksklusivitas Payload:** Response payload `GET /notifications` dengan sadar membatasi pengembalian _fields_ pada 5 buah _key_ (`id`, `tipe`, `pesan`, `dibaca`, `createdAt`). Properti `userId` maupun `jadwalId` secara aman dihilangkan untuk tidak memaparkan abstraksi ID ke tampilan depan (UI), sesuai instruksi `API-Contract.md`.
  - **Idempotensi & Reactive Scoping pada PATCH:** `PATCH` untuk menandai _read_ berjalan dengan Idempotensi (_dipanggil 2x tetap sukses_), memanfaatkan pendekatan query reaktif `updateMany` secara simultan dengan kondisi `id` _AND_ `userId`. Ketiadaan row memicu penolakan 404 (baik untuk salah ID mapun hak akses ID milik user lain) sehingga _client_ tak bisa membedakan mana _row_ tidak ada vs _row_ milik user lain (prinsip keamanan Data Hiding).
  - **Perbaikan Type-Safety (Zero 'Any'):** Masalah dependensi import _type_ asertif `ErrorEnvelope` yang salah `import` (_salah direktori_) serta salah memanggil variabel pada unit _test_ telah diidentifikasi dan ditangani mandiri sehingga tidak menimbulkan peringatan _linter unsafe assignment_ secara jangka panjang.

## [Stage 25] Track F1 — GET /employees/available

- **Selesai:** Endpoint `GET /employees/available` (filter ketersediaan karyawan berdasar shift & izin).
- **File:** `modules/employees/*` (controller, service, DTO, spec e2e).
- **Verifikasi:** 221/221 test (Full suite) lolos.
- **Catatan Penting:**
  - **Validasi Tanggal Strict:** Pakai `@Matches` regex (YYYY-MM-DD) menolak malformed ISO, cegah invalid `new Date()`.
  - **No Double-Wrap:** Controller direturn _raw array_, di-assert eksplisit di test agar bebas dari bug _double-wrap_.
  - **Type-Safety & Cleanup:** Param role dikunci ke Enum `Role` Prisma. Test diisolasi UUID marker, menjamin `deleteMany` aman 100% (Stage 15 compliance).
  - **Silent Scoping:** SUPERVISOR yang salah query `siteId` di luar aksesnya langsung dibalas `[]` (sembunyikan data tanpa error 403/404).

## [Stage 26] Track F2 — GET /employees/:id/schedules

- **Selesai:** Endpoint `GET /employees/:id/schedules` untuk melihat histori/jadwal shift seorang karyawan di rentang tanggal tertentu (HR_ADMIN only).
- **File:** `modules/employees/*` (controller, service, DTO, spec e2e).
- **Verifikasi:** 234/234 test (Full suite) lolos.
- **Catatan Penting:**
  - **Validasi Rentang Tanggal:** Dilakukan di service layer melempar `400 RENTANG_TANGGAL_TIDAK_VALID` jika `tanggalMulai > tanggalSelesai`.
  - **Reaktif pada Entitas:** Karyawan yang tidak ada (atau bukan role KARYAWAN) dilempar `404 KARYAWAN_TIDAK_DITEMUKAN`.
  - **Empty Result:** Jika rentang valid tapi tidak ada jadwal shift, dikembalikan `[]` dengan HTTP 200 (bukan error).
  - **Type-Safety:** DTO menggunakan regex `@Matches` konsisten untuk parsing tanggal YYYY-MM-DD. Param `id` di controller dikunci via `ParseUUIDPipe`.

## [Stage 27] Track F3 — GET /schedules/today

- **Selesai:** Endpoint `GET /schedules/today` untuk role KARYAWAN melihat jadwal mereka hari ini dan status kehadirannya.
- **File:** `modules/schedules/*` (controller, service, spec e2e).
- **Verifikasi:** Lolos lint, build, dan 42/42 test E2E di module schedules.
- **Catatan Penting:**
  - **Penanganan Shift Malam (H-1):** Endpoint secara akurat tidak hanya exact-match `tanggal` hari ini, melainkan juga menangkap shift yang jadwalnya dimulai kemarin (H-1) tetapi `jamSelesai`-nya jatuh di hari ini (Sesuai `TDD.md` §3 Poin 13).
  - **Derivasi Status Kehadiran:** Status `BELUM_CHECKIN`, `SUDAH_CHECKIN`, atau `SELESAI` dikalkulasi _real-time_ berdasarkan data dari `LogKehadiran`.
  - **Sinergi Auto-Mark TIDAK_HADIR:** Integrasi dengan cron dipastikan konsisten. Cron mengset `waktuCheckIn: null`, yang secara otomatis terbaca sebagai `BELUM_CHECKIN` pada layer derivasi (karena faktanya memang tidak check-in).
  - **100% Type-Safe:** Resolusi linter `no-unsafe-assignment` dan `no-unsafe-member-access` dengan deklarasi _interface response shape_ secara eksplisit di file test (Zero `any` compliance).

## [Stage 28] Track F4 — GET /dashboard/attendance?tanggal=

- **Selesai:** Endpoint `GET /dashboard/attendance?tanggal=` untuk role SUPERVISOR melihat ringkasan status kehadiran karyawan di site yang diawasi pada tanggal tertentu.
- **File Dibuat/Diubah:** `modules/dashboard/*` (controller, service, DTO, spec e2e, module), `app.module.ts`.
- **Verifikasi:** Lolos lint, build, dan 14/14 test di module dashboard (8 service tests + 6 controller e2e tests).
- **Catatan Penting:**
  - **Overnight Shift (H-1):** Menyajikan shift malam dari H-1 yang jam selesainya jatuh pada tanggal query (konsisten dengan `findToday` menggunakan `date.util.ts`).
  - **Strict Precedence Status:** Status ditentukan sesuai urutan prioritas: `TIDAK_HADIR` (cron) > `TERLAMBAT`/`HADIR` (tanpa grace period) > `IZIN` (PengajuanIzin Approved) > `BELUM`.
  - **Silent Narrow Scoping:** Supervisor tanpa site sama sekali atau query di luar wewenang mengembalikan `[]`.
  - **Strict Type-Safety:** Menggunakan union type `DashboardAttendanceStatus` dan interface `DashboardAttendanceItem` (Zero `any` compliance).

## [Stage 29] Track F5 — GET /dashboard/unfilled-shifts?tanggal=

- **Selesai:** Endpoint `GET /dashboard/unfilled-shifts?tanggal=` untuk role SUPERVISOR melihat daftar shift yang sedang berlangsung tetapi belum di-check-in setelah melewati ambang T+15 menit dari jamMulai.
- **File Dibuat/Diubah:** `common/constants/attendance.constant.ts`, `modules/attendance-cron/attendance-cron.service.ts`, `modules/dashboard/*` (controller, service, spec e2e).
- **Verifikasi:** Full test suite lolos 258/258 test, serta 28/28 test di module dashboard (16 service unit tests + 12 controller e2e tests).
- **Catatan Penting:**
  - **Konsolidasi Threshold T+15:** Ambang T+15 diekstrak ke `UNFILLED_SHIFT_THRESHOLD_MS` di `common/constants/attendance.constant.ts` dan direuse bersama oleh `attendance-cron.service.ts` dan `dashboard.service.ts`.
  - **Kriteria Shift Kosong Actionable:** Hanya menyajikan shift yang `now >= jamMulai + T+15`, `now < jamSelesai` (belum berakhir), belum check-in, dan karyawan TIDAK memiliki `PengajuanIzin` status `APPROVED` yang overlap.
  - **Kalkulasi Keterlambatan:** Menghitung `menitTerlambat = Math.floor((now - jamMulai) / 60000)`.
  - **Overnight Shift (H-1):** Tetap mendeteksi shift malam dari H-1 yang jam selesainya belum berakhir pada waktu sekarang.

## [Stage 30] Track F6 — GET /attendance/summary & GET /attendance/attempts

- **Selesai:** Endpoint `GET /attendance/summary` dan `GET /attendance/attempts` untuk role HR_ADMIN melihat agregasi ringkasan kehadiran karyawan dan riwayat percobaan absensi dalam periode tertentu.
- **File Dibuat/Diubah:** `common/utils/shift-status.util.ts`, `modules/dashboard/dashboard.service.ts`, `modules/attendance/*` (controller, service, DTOs, specs).
- **Verifikasi:** Full test suite lolos 291/291 test (21 test suites passed), serta 52/52 test di module attendance.
- **Catatan Penting:**
  - **Ekstraksi Logic Precedence Status:** Penentuan status shift diekstraksi ke `determineShiftStatus` di `common/utils/shift-status.util.ts` sebagai _single source of truth_ untuk `getAttendanceDashboard` (F4) dan `getAttendanceSummary` (F6).
  - **Agregasi HR_ADMIN Tanpa Scoping:** `getAttendanceSummary` menghitung agregasi totalJadwal, totalHadir, totalTerlambat, totalTidakHadir, totalIzin, dan totalBelum per karyawan untuk seluruh site pada periode tertentu. Karyawan tanpa jadwal di-exclude.
  - **Listing Percobaan Absensi Kronologis:** `getAttendanceAttempts` menyajikan daftar riwayat `PercobaanAbsensi` per karyawan yang diurutkan secara `waktu` ascending.

## [Stage 31] Track F7 — GET /reports/export?format=pdf|xlsx (Penutupan Track F)

- **Selesai:** Endpoint `GET /reports/export?format=pdf|xlsx&periodeMulai=&periodeSelesai=` untuk role HR_ADMIN mengekspor laporan ringkasan kehadiran karyawan dalam format PDF atau XLSX.
- **File Dibuat/Diubah:** `modules/attendance/attendance.service.ts`, `modules/attendance/reports.controller.ts`, `modules/attendance/attendance.module.ts`, `modules/attendance/dto/get-attendance-report-query.dto.ts`, `modules/attendance/reports.service.spec.ts`, `modules/attendance/reports.controller.spec.ts`, `package.json` (dependency baru).
- **Verifikasi:** Full test suite lolos 300/300 test (23 test suites passed).
- **Catatan Penting:**
  - **Dependency Baru:** `exceljs` (XLSX generation), `pdfkit` + `@types/pdfkit` (PDF generation).
  - **Bypass ResponseInterceptor:** Endpoint ekspor menggunakan `@Res()` (Express Response) untuk mengirimkan binary file stream langsung, mem-bypass `ResponseInterceptor` global yang secara default membungkus response menjadi JSON `{success, data, meta}`. Hanya berlaku untuk route ini, tidak mengubah behavior route lain.
  - **Reuse Data:** Method `generateAttendanceReport` mereuse `getAttendanceSummary` (F6) untuk mengambil data — tidak query ulang ke database secara terpisah.
  - **PDF Table Layout:** Menggunakan tabel berbasis koordinat X/Y tetap per kolom (`PdfColumnDef` interface), garis vektor PDFKit (`moveTo`/`lineTo`/`stroke`), dan auto page break dengan repeat header di setiap halaman baru.
  - **Track F (F1-F7) telah selesai sepenuhnya.**

## [Stage 32] Track G1 — POST /employees/:id/reset-face-registration (Aksi Manual HR)

- **Selesai:** Endpoint `POST /employees/:id/reset-face-registration` untuk role HR_ADMIN me-reset data wajah karyawan (`faceEmbedding` menjadi `[]`).
- **File Dibuat/Diubah:** `modules/employees/employees.service.ts`, `modules/employees/employees.controller.ts`, `modules/employees/employees.service.spec.ts`, `modules/employees/employees.controller.spec.ts`.
- **Verifikasi:** Full test suite lolos 309/309 test (23 test suites passed).
- **Catatan Penting:**
  - **Exception Handling Reaktif:** Operasi update dieksekusi secara reaktif menangkap `PrismaClientKnownRequestError` (`P2025`) untuk _record not found_, alih-alih menggunakan `findUnique` secara berurutan.
  - **Isolasi Database Test:** Memperbaiki bug pada _cleanup fixture_ E2E test `employees.controller.spec.ts` dengan memastikan _test user_ unik (`randomUUID()`) dan dibuat/dihapus secara terisolasi per _describe block_ agar tidak memicu `Unique constraint failed` atau konflik dengan token JWT test lain.
  - **Response Controller:** Route menggunakan dekorator `@HttpCode(HttpStatus.OK)` untuk mengembalikan HTTP 200 (karena secara default `@Post` merespon 201).
  - **Track G (G1) telah selesai sepenuhnya.** Seluruh backlog MVP (Track A-G) selesai.

## [Stage 33] Mobile Foundation (Seluruh Tahap 1-5)

- **Selesai:** Tahap 1 (Scaffold & structure), Tahap 2 (API Client Layer & Types), Tahap 3 (AuthStore & SecureStore), Tahap 4 (Routing Guards), dan Tahap 5 (Unit Tests).
- **File Dibuat/Diubah:** `src/app/*`, `src/screens/*`, `src/types/api.ts`, `src/services/apiClient.ts`, `src/store/authStore.ts`, dan tes di `src/**/__tests__/*`.
- **Verifikasi:** 17/17 test lolos (store, routing guards, interceptors), build TypeScript bersih (Zero `any`).
- **Catatan Penting:**
  - **Auth Hydration (Fix):** Seluruh `AuthData` (termasuk `role`) disimpan sebagai JSON di `expo-secure-store`. Pada _cold start_, aplikasi me-restore state secara utuh tanpa hit API, sehingga _routing guard_ bisa segera mengarahkan ke dashboard yang tepat dan menghindari bug _zombie token_.
  - **Interceptor Axios:** Menginjeksi token otomatis dan merespons 401 dengan menghapus sesi (`clearAuth`) lalu me-redirect ke login.
  - **Routing Guard:** Proteksi berbasis role berjalan murni via Expo Router Strict Typed Routes. Unit test dilakukan pada level _pure logic_ menggunakan _mock_ `expo-router` (workaround kompatibilitas `react-test-renderer` v19).
  - Seluruh tahapan **Mobile Foundation** telah tuntas sesuai `mobile-foundation.md`.

## [Stage 34] Auth Mobile — Setup NativeWind & Custom Fonts (Tahap 1.5)

- **Selesai:** Konfigurasi NativeWind v4 dengan Tailwind CSS v3.4, integrasi font `Plus Jakarta Sans`, dan konversi UI LoginScreen dari `StyleSheet` manual ke kelas NativeWind.
- **File Dibuat/Diubah:** `tailwind.config.js`, `babel.config.js`, `metro.config.js`, `src/global.css`, `src/app/_layout.tsx`, `src/screens/auth/LoginScreen.tsx`, `nativewind-env.d.ts`.
- **Verifikasi:** Build TypeScript lolos tanpa error, font lokal berhasil di-load menggunakan `useFonts` sebelum UI dirender (Splash screen disembunyikan hanya saat auth dan font ready).
- **Catatan Penting:**
  - **Kebutuhan `--legacy-peer-deps`:** Instalasi `nativewind` beserta dependensinya wajib menggunakan flag `--legacy-peer-deps`. Ini diakibatkan oleh konflik _peer dependency_ React 19 yang dibawa secara bawaan oleh ekosistem Expo (bentrok dengan paket-paket jest-expo yang masih mereferensikan React 19 lama/berbeda).
  - **Local Font Loading:** Menghindari _Flash of Unstyled Text (FOUT)_ dengan cara menahan `SplashScreen` hingga file TTF fisik (Regular, SemiBold, Bold, ExtraBold) dari `assets/fonts/` sepenuhnya siap. Nama font dikustomisasi di konfigurasi Tailwind (misal: `font-sans-bold`) guna menyelaraskan sintaks dengan _key_ statis di `useFonts`.

## [Stage 35] Auth Mobile — Tahap 2: Wajib Ganti Password Screen & Endpoint POST /auth/change-password

- **Selesai:** Implementasi UI & logic screen `(auth)/change-password-required` (Tahap 2 Auth Mobile) dan endpoint `POST /auth/change-password` di NestJS backend.
- **File Dibuat/Diubah:**
  - Backend (`apps/backend/src/modules/auth/`): `dto/change-password.dto.ts` _(NEW)_, `auth.service.ts`, `auth.controller.ts`.
  - Mobile (`apps/mobile/src/`):
    - `screens/auth/ChangePasswordRequiredScreen.tsx` _(NEW)_ & test-nya _(NEW)_
    - `screens/auth/LoginScreen.tsx`
    - `app/(auth)/change-password-required.tsx`
    - `components/KeyboardScreen.tsx` _(NEW)_
- **Verifikasi:**
  - Mobile: 4/4 test suites (25/25 unit tests) PASS.
  - Backend: 23/23 test suites (316/316 integration tests) PASS.
  - TypeScript: 0 error di mobile & backend (`tsc --noEmit`).
- **Catatan Penting & Penutupan Catatan Stage 18:**
  - **Penutupan Catatan Pending Stage 18:** Implementasi `ChangePasswordDto` di backend mengeksekusi secara eksplisit penutupan catatan dari **Stage 18**. Aturan validasi panjang minimal password baru (`@MinLength(8)`) disinkronkan persis dengan `ResetPasswordDto` (`reset-password.dto.ts`), menjamin konsistensi 100% antara endpoint reset password dan ganti password.
  - **Access Gate:** `ChangePasswordRequiredScreen` secara ketat memvalidasi `pendingPasswordLama`. Jika pengguna mengakses layar secara langsung tanpa melalui alur login resmi, layar otomatis melakukan redirect paksa ke `/(auth)/login`.
  - **Penanganan Error Retry (`PASSWORD_LAMA_SALAH`):** Saat backend mengembalikan kode error `PASSWORD_LAMA_SALAH`, state `pendingPasswordLama` sengaja dipertahankan di `authStore` agar pengguna dapat mencoba ulang (_retry_) tanpa harus terlempar balik ke layar login.
  - **Komponen Reusable `<KeyboardScreen>`:** Dibangun di `src/components/KeyboardScreen.tsx` membungkus `KeyboardAvoidingView` (`behavior="padding"` + `keyboardVerticalOffset` untuk Android) dan `ScrollView`, dan diterapkan pada `LoginScreen` serta `ChangePasswordRequiredScreen`.

## [Stage 36] Auth Mobile — Tahap 3 & 4: Lupa Password & Penutupan Track H

- **Selesai:** Implementasi ForgotPassword & ResetPassword, melengkapi seluruh alur Track H (Auth Mobile).
- **File Dibuat/Diubah:**
  - `apps/mobile/src/`:
    - `screens/auth/ForgotPasswordScreen.tsx` _(NEW)_ & test-nya
    - `screens/auth/ResetPasswordScreen.tsx` _(NEW)_ & test-nya
    - `app/(auth)/{forgot,reset}-password.tsx` (re-exports)
  - Fix: Gate redirect di layar Change/Reset Password dipindah ke `useEffect` (cegah crash `assertIsReady`).
- **Verifikasi:** 6/6 test suites (40 tests) & `tsc` (mobile/backend) PASS.
- **Catatan Penting:**
  - **Visual Konsisten:** Mengikuti standar LoginScreen (card `bg-surface`, input `h-[46]`, `KeyboardScreen`).
  - **Anti-Enumeration vs Network Error:** API `forgot-password` selalu return 200 (anti-enumeration). Network error/5xx tetap ditampilkan jelas agar user bisa retry.
  - **State Lintas Layar:** Email diteruskan ke ResetPassword via URL param (transien & tidak sensitif).
  - **Error Flow:** Jika token invalid (`TOKEN_TIDAK_VALID`), user tetap di layar Reset (tidak dilempar balik).
  - **Penutupan Track H:** Tahap 1–4 Auth Mobile selesai. Validasi `MinLength(8)` konsisten di backend & mobile.(Reset Password) telah selesai dan diverifikasi. `MinLength(8)` konsisten di seluruh aplikasi (catatan pending Stage 18 sudah ditutup di Stage 35). Track H sepenuhnya **SELESAI**.

## [Stage 37] Technical Debt — Bypass Sementara Verifikasi Wajah (RAM Constraint)

- **Tanggal Dibuat:** 2026-08-01
- **Target Dihapus:** 2026-08-05 (Setelah upgrade RAM ke 24 GB)
- **Keterangan:**
  - Menambahkan environment variable `SKIP_FACE_VERIFICATION=true` di `apps/backend/.env` dan `SKIP_FACE_VERIFICATION=false` di `.env.example`.
  - Di `FaceVerificationService` (`apps/backend/src/modules/face-verification/face-verification.service.ts`), jika `process.env.SKIP_FACE_VERIFICATION === 'true'`, service langsung mengembalikan dummy `EmbedFaceResponse` (`embedding: [0.1, 0.2, 0.3]`, `liveness: { isLive: true, confidence: 1.0 }`) tanpa memanggil `POST /internal/embed` di Python `face-service`.
  - Hal ini dilakukan agar pengembangan dan pengujian mobile app tidak terhambat oleh _timeout_ / _resource bottleneck_ saat memproses model AI di mesin dev RAM 12 GB.
- **PENTING saat bypass dihapus:** Semua user yang registrasi wajah SAAT bypass aktif
  (embedding dummy 3-dim, bukan 128-dim asli) WAJIB reset & registrasi ulang wajah
  via endpoint HR (POST /employees/:id/reset-face-registration) — embedding dummy
  tidak valid untuk perbandingan cosine similarity yang sebenarnya.

## [Stage 38] Track I — Karyawan: Registrasi Wajah Mobile (face-registration-mobile)

- **Selesai:** Implementasi UI & logic registrasi wajah karyawan (`FaceCameraScreen`, `FacePreviewScreen`, `FaceConfirmScreen`), route `(karyawan)/face-registration*`, dan unit test suite.
- **File Dibuat/Diubah:**
  - `apps/mobile/src/`:
    - `screens/karyawan/FaceCameraScreen.tsx` _(NEW)_
    - `screens/karyawan/FacePreviewScreen.tsx` _(NEW)_
    - `screens/karyawan/FaceConfirmScreen.tsx` _(NEW)_
    - `screens/karyawan/__tests__/FaceCameraScreen.test.tsx` _(NEW)_
    - `screens/karyawan/__tests__/FacePreviewScreen.test.tsx` _(NEW)_
    - `screens/karyawan/__tests__/FaceConfirmScreen.test.tsx` _(NEW)_
    - `app/(karyawan)/face-registration.tsx` _(NEW)_
    - `app/(karyawan)/face-registration-preview.tsx` _(NEW)_
    - `app/(karyawan)/face-registration-confirm.tsx` _(NEW)_
    - `store/authStore.ts`
- **Verifikasi:** Unit test suite & `tsc` PASS.
- **Catatan Penting:**
  - **Camera Permission & UI:** Screen kamera menyajikan panduan posisi wajah oval statis, pengolahan izin akses kamera native Expo, dan tombol _capture_ single snapshot.
  - **Single Photo Preview & Submit:** Foto ditampilkan penuh (full-screen) dengan opsi ambil ulang atau konfirmasi submit multipart/form-data ke `POST /users/me/face-registration`.
  - **State Update & Navigation:** Setelah sukses submit, `wajahTerdaftar` di `authStore` otomatis di-update menjadi `true` dan pengguna diarahkan ke Home Karyawan.

## [Stage 39] Track I — Karyawan: Home & Jadwal (karyawan-home-jadwal) & Penutupan Track I

- **Selesai:** Implementasi penuh alur Karyawan Home & Jadwal (Tahap 1 Tab Skeleton, Tahap 2 Data & UI Utama, Tahap 3 Polish, Empty State, Quick Action, Reminder Banner, Pull-to-Refresh & Testing).
- **File Dibuat/Diubah:**
  - `apps/mobile/src/`:
    - `components/ComingSoonPlaceholder.tsx` _(NEW)_
    - `types/schedule.ts` _(NEW)_
    - `services/schedule.service.ts` _(NEW)_
    - `screens/karyawan/BerandaScreen.tsx` _(NEW)_
    - `screens/karyawan/__tests__/BerandaScreen.test.tsx` _(NEW)_
    - `app/(karyawan)/_layout.tsx`
    - `app/(karyawan)/izin.tsx` _(NEW)_
    - `app/(karyawan)/absensi.tsx` _(NEW)_
    - `app/(karyawan)/notifikasi.tsx` _(NEW)_
    - `app/_layout.tsx` (QueryClientProvider wrapper)
- **Verifikasi:** Full test suite mobile (8/8 passed, 64 tests) & backend (20/20 passed, 316 tests) PASS 100%. `npx tsc --noEmit` PASS (0 error).
- **Catatan Penting:**
  - **Tabs Navigation Skeleton:** Navigasi `(karyawan)` menggunakan Expo Router `<Tabs>` dengan 4 tab. Tab Absensi didesain menonjol di tengah (elevated circle `#FFC81E`). Gate check `wajahTerdaftar` tetap berfungsi sebelum Tab Navigator dirender.
  - **Dynamic Insets:** Menggunakan `useSafeAreaInsets` agar tinggi dan padding Tab Bar secara otomatis menyesuaikan tombol navigasi/gesture bar di HP fisik Android.
  - **TanStack Query & Service:** `getTodaySchedules` memanggil `GET /schedules/today`. Dipasang `QueryClientProvider` di root layout.
  - **Reminder Banner:** Banner peringatan warna `warning` aktif jika status `BELUM_CHECKIN` dan waktu sekarang berada pada rentang **30 menit sebelum `jamMulai` hingga `jamSelesai`**.
  - **Quick Action & Help Modal:** Tombol Izin mengarahkan ke tab Izin, tombol Bantuan membuka modal berisi kontak & FAQ HR.
  - **Penutupan Track I:** Seluruh requirement Track I (Gate & Home) telah **SELESAI 100%**.

## [Stage 40] Track E — Fix Race Condition Overlap Eksekusi Cron Job (in-memory mutex)

- **Selesai:** Penanganan race condition overlap eksekusi cron job pada `AttendanceCronService` menggunakan in-memory mutex (`isRunning` flag & `try-finally`).
- **File Diubah:**
  - `apps/backend/src/modules/attendance-cron/attendance-cron.service.ts`
  - `apps/backend/src/modules/attendance-cron/attendance-cron.service.spec.ts`
- **Verifikasi:** Full test suite backend PASS 100% (23/23 test suites, 323/323 tests passed). `npm run lint` & `npm run build` PASS (0 error).
- **Catatan Penting:**
  - **In-Memory Mutex Guard:** Ditambahkan properti `private isRunning = false;` di `AttendanceCronService`. Di awal `handleCron()`, jika `isRunning === true`, eksekusi tick baru langsung memunculkan log warning dan `return` (skip eksekusi).
  - **Exception-Safe Cleanup:** Eksekusi 3 sub-fungsi (`checkAndSendReminders`, `checkAndSendSupervisorAlerts`, `checkAndMarkAbsent`) dibungkus dalam blok `try { ... } finally { this.isRunning = false; }` untuk menjamin reset flag mutex meskipun terjadi exception pada salah satu sub-fungsi.
  - **Dedicated Unit/Integration Tests:** Ditambahkan unit test suite `Overlap Mutex Protection` di `attendance-cron.service.spec.ts` yang menguji:
    1. Eksekusi overlap `handleCron()` yang bersamaan secara otomatis di-skip pada tick kedua, dan sub-fungsi hanya di-invoke 1x.
    2. Assertion state `isRunning` terbukti `true` saat tick pertama sedang in-flight, dan kembali `false` setelah selesai baik pada eksekusi normal maupun saat sub-fungsi melempar exception.
  - **Keputusan Arsitektur (Technical Debt Track E Resolved):** Karena cron job dijalankan dalam 1 proses tunggal NestJS (single-instance runner), solusi in-memory mutex ini cukup dan efisien tanpa memerlukan distributed lock Redis (item distributed lock di Track M resmi dibatalkan/direvisi di `backlog.md`).

## [Stage 41] Track M — Implementasi Redis Caching & Cache Invalidation (redis-cache-dashboard-reports)

- **Selesai:** Infra `ioredis` (`redis:7-alpine`), `CacheService` global fail-open, cache-aside pada `getAttendanceDashboard()` (TTL 30s) & `getAttendanceSummary()` (TTL 300s, reused oleh `/reports/export`), serta invalidasi cache dashboard terpusat.
- **File Diubah:** `docker-compose.yml`, `package.json`, `.env`, `.env.example`, `app.module.ts`, `common/cache/` (CacheService, CacheModule, spec), `dashboard/` (service, module, spec), `attendance/` (service, module, spec), `leave-requests/` (service, module, spec), `attendance-cron/` (service, module, spec).
- **Verifikasi:** Full test suite backend PASS 100% (24/24 test suites, 348/348 tests passed). `npm run lint` & `npm run build` PASS.
- **Catatan Penting:**
  - **Fail-Open:** Seluruh method `CacheService` & invalidasi dibungkus `try-catch` agar kegagalan Redis/Prisma di layer cache tidak pernah menghentikan transaksi DB atau melempar exception ke client.
  - **Cache-Aside & Early-Return:** Dashboard (`dashboard:attendance:{supervisorId}:{tanggal}`, TTL 30s) & Summary (`attendance:summary:{periodeMulai}:{periodeSelesai}`, TTL 300s). Early-return hasil kosong `[]` tetap di-cache untuk mencegah leak query. `generateAttendanceReport()` otomatis me-reuse cache summary.
  - **Invalidasi Terpusat:** `invalidateDashboardCache(siteId, tanggal)` meng-evict cache semua supervisor terkait pada event: check-in/out sukses, pengajuan izin `APPROVED`, dan cron auto-mark `TIDAK_HADIR`. Action `REJECTED` sengaja tidak di-evict karena tidak mengubah status dashboard.

## [Stage 42] Track M — Implementasi Redis Rate Limiting Auth (redis-rate-limiting-auth)

- **Selesai:** Rate limiting berbasis Redis untuk `POST /auth/login` (5x/60s) dan `POST /auth/forgot-password` (3x/300s) via `@nest-lab/throttler-storage-redis` & `FailOpenThrottlerGuard`.
- **File Dibuat/Diubah:** `package.json`, `app.module.ts`, `auth/` (module, controller, spec, `auth-rate-limit.spec.ts` _(NEW)_), `fail-open-throttler.guard.ts` _(NEW)_, `docs/feature/redis-rate-limiting-auth.md` _(NEW)_, `API-Contract.md`.
- **Verifikasi:** Full test suite backend (25/25 test suites, 354/354 tests) & 2x consecutive scoped test PASS 100%. `npm run lint` & `npm run build` PASS.
- **Catatan Penting:**
  - **Fail-Open & IP Tracking:** Error Redis/timeout di-catch oleh `FailOpenThrottlerGuard` agar request lolos (`return true`) tanpa HTTP 500. IP dilacak murni via `req.ip`. Error 429 menggunakan envelope standar (`TERLALU_BANYAK_PERCOBAAN`).
  - **Scoped Test Cleanup:** Cleanup test di `auth-rate-limit.spec.ts` di-scope ke pattern `*{*:default}:*` tanpa `FLUSHALL`/`FLUSHDB`.
  - **Penutupan Track M:** Requirement Track M resmi **SELESAI 100%**.

## [Stage 43] Track J — Attendance Mobile (attendance-mobile)

- **Selesai:** Implementasi penuh fitur presensi karyawan (`check-in` & `check-out`): API service (`attendance.service.ts`), kamera & GPS (`AttendanceCameraScreen.tsx`), preview foto & 3-cabang response handling (`AttendancePreviewScreen.tsx`), rincian sukses (`AttendanceSuccessScreen.tsx`), wiring tab Absensi (`AbsensiScreen.tsx`), serta skrip Maestro E2E flow (`e2e/karyawan-flow.yaml`).
- **File Dibuat/Diubah:** `package.json`, `types/attendance.ts` _(NEW)_, `services/attendance.service.ts` _(NEW)_, `services/__tests__/attendance.service.test.ts` _(NEW)_, `screens/karyawan/` (`AttendanceCameraScreen.tsx` _(NEW)_, `AttendancePreviewScreen.tsx` _(NEW)_, `AttendanceSuccessScreen.tsx` _(NEW)_, `AbsensiScreen.tsx` _(NEW)_), `screens/karyawan/__tests__/` (`AttendanceCameraScreen.test.tsx` _(NEW)_, `AttendancePreviewScreen.test.tsx` _(NEW)_, `AbsensiScreen.test.tsx` _(NEW)_), `app/(karyawan)/` (`_layout.tsx`, `absensi.tsx`, `attendance-camera.tsx` _(NEW)_, `attendance-preview.tsx` _(NEW)_, `attendance-success.tsx` _(NEW)_), `e2e/karyawan-flow.yaml` _(NEW)_.
- **Verifikasi:** Full mobile test suite (12/12 test suites, 89/89 tests pass), `npx tsc --noEmit` PASS (0 error, ZERO `as any`).
- **Catatan Penting:**
  - **Isolasi Kamera & UX:** `AttendanceCameraScreen.tsx` dipisah dari `FaceCameraScreen.tsx` (duplikasi visual, tanpa refaktor shared component) untuk mencegah regresi. Izin kamera + lokasi (`expo-location` ~19.0.7) diminta bersamaan saat mount.
  - **Descriptor Pattern & Double-Tap Guard:** UI kamera di-gate `renderAttendanceCameraScreenDescriptor` langsung di JSX (`{descriptor.hasCaptureButton && ...}`). Submit di-guard via `useRef` lock (`isSubmittingRef`) secara sinkron mencegah race condition.
  - **3-Cabang Response Handling:** (a) `VALID` → navigasi ke `AttendanceSuccessScreen`; (b) HTTP 200 non-`VALID` (`GAGAL_LOKASI`/`DI_LUAR_JENDELA_WAKTU`) → banner error di preview + retry tanpa paksa balik kamera; (c) HTTP 400/404/409 (`SUDAH_CHECKIN`, dst) → error server + tombol kembali ke tab Absensi.
  - **Wiring Tab Absensi & Multi-Shift:** `AbsensiScreen.tsx` me-reuse `getTodaySchedules`, merender state kosong jika tanpa jadwal, dan merender daftar shift dengan tombol aksi sesuai `statusKehadiran`.
