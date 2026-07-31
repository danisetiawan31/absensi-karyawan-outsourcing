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
