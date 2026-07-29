# Log Pengerjaan

## [Stage 1] Inisialisasi NestJS & NPM Workspaces

- **File diubah/dibuat:**
  - `package.json` (root)
  - `apps/backend/package.json`
  - Struktur default NestJS (merged into `apps/backend/src`)
- **Verifikasi:** npm workspaces berhasil terhubung.
- **Catatan/Penyimpangan:**
  - Melakukan merge manual dari scaffold CLI agar folder `prisma`, `src/common`, dan `src/modules` yang sudah ada tidak tertimpa/terhapus.

## [Stage 2] Setup Tooling Prisma di apps/backend

- **File diubah/dibuat:**
  - `apps/backend/package.json` (tambah dependencies `@prisma/client`, `prisma`, dan script `prisma:generate`)
  - `apps/backend/.env.example` (ditambah dengan placeholder)
  - `apps/backend/prisma/schema.prisma` (ditambah generator & config db)
- **Verifikasi:**
  - Install dependencies berhasil dijalankan.

## [Stage 3] Setup Docker Postgres & Migration

- **File diubah/dibuat:**
  - `docker-compose.yml` (baru, untuk service postgres:16)
  - `apps/backend/.env` (baru, dengan `DATABASE_URL`)
  - `apps/backend/package.json` (downgrade `@prisma/client` dan `prisma` ke versi 6.4.1 agar kompetibel dengan standar `schema.prisma`)
  - `apps/backend/prisma/schema.prisma` (mengembalikan properti `url = env("DATABASE_URL")` yang sebelumnya dihapus)
  - `apps/backend/prisma/migrations/20260727205210_init/migration.sql` (file migrasi yang di-generate oleh Prisma)
- **Verifikasi:**
  - `docker compose up -d` berhasil (container `absensi_postgres` running).
  - Perintah `npx prisma migrate dev --name init` berhasil dieksekusi tanpa error. Tabel dan enum telah ter-create ke database.
  - Perintah `npx prisma generate` berhasil dijalankan pasca migrasi.
- **Catatan/Penyimpangan:**
  - Melakukan downgrade Prisma dari "7.9.0" ke `6.4.1` (versi stabil saat ini) untuk menyelesaikan isu hilangnya dukungan properti `url` di file `schema.prisma` pada versi yang digunakan sebelumnya, tanpa perlu mengotori setup dengan `prisma.config.ts`.

## [Stage 4] Auth Login & JWT Infrastructure

- **File diubah/dibuat:**
  - `apps/backend/package.json` (install `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `class-validator`, dan type pendukungnya. Dependency `uuid` telah di-uninstall)
  - `apps/backend/.env` & `.env.example` (penambahan `JWT_SECRET`)
  - `apps/backend/src/common/middlewares/request-id.middleware.ts` (generate requestId menggunakan native `crypto.randomUUID()`)
  - `apps/backend/src/common/interceptors/response.interceptor.ts` (global success envelope)
  - `apps/backend/src/common/filters/all-exceptions.filter.ts` (global error envelope, disederhanakan dan menggunakan masking "Terjadi kesalahan pada server" untuk non-HttpException)
  - `apps/backend/src/common/prisma/prisma.service.ts` & `prisma.module.ts` (Prisma module)
  - `apps/backend/src/main.ts` (registrasi global middleware, interceptor, filter, dan `ValidationPipe` custom dengan `exceptionFactory` ke format `{ field, issue }`)
  - `apps/backend/src/modules/auth/` (AuthModule, AuthService, AuthController, LoginDto)
  - `apps/backend/src/modules/auth/strategies/jwt.strategy.ts` & `guards/jwt-auth.guard.ts` (JWT passport)
  - `apps/backend/prisma/seed.ts` (seeding 3 dummy role account)
  - `apps/backend/src/modules/auth/auth.service.spec.ts` & `auth.controller.spec.ts` (unit tests)
- **Verifikasi:**
  - `npm run test -- src/modules/auth` Lolos (100% PASS, 6 tests). Skema test menggunakan data asil ke database Prisma (di-cleanup otomatis lewat beforeAll/afterAll) bukan mock.
  - Untuk test manual: jalankan `npm run prisma:seed -w @absensi/backend` (atau `npx prisma db seed`), lalu hit `POST http://localhost:3000/auth/login` dengan raw JSON: `{ "email": "karyawan@test.local", "password": "password123" }`.
- **Catatan/Penyimpangan:**
  - Saya membuat modul `PrismaModule` (`src/common/prisma`) secara eksplisit dan mendaftarkannya di `AppModule` karena AuthService membutuhkan `PrismaService` untuk akses DB.
  - Sesuai koreksi Anda, test benar-benar tidak bergantung pada `seed.ts`, namun file seed tetap saya buat dan di daftarkan di `package.json` agar Anda bisa testing manual.
  - Email untuk pengujian otomatis di test suite (seperti `test_auth_service@test.local`) sudah dipastikan berbeda dengan email seed sehingga tidak ada collision.

## [Stage 5] Track A1 - Sites CRUD & RolesGuard

- **File diubah/dibuat:**
  - `apps/backend/prisma/migrations/20260728011415_v3/migration.sql` (`Site.statusAktif` + perubahan lain dari batch update dokumen sebelumnya)
  - `apps/backend/src/common/decorators/roles.decorator.ts` & `guards/roles.guard.ts` (kontrol akses role, reusable lintas module)
  - `apps/backend/src/modules/sites/dto/*` (`create-site.dto.ts`, `update-site.dto.ts`, `find-sites-query.dto.ts`)
  - `apps/backend/src/modules/sites/sites.service.ts`, `sites.controller.ts`, `sites.module.ts` (terdaftar di `app.module.ts`)
  - `apps/backend/src/modules/sites/sites.service.spec.ts` & `sites.controller.spec.ts`
- **Verifikasi:**
  - `npm run test -- src/modules/sites` lolos 20/20 — cover 201 sukses, validasi gagal, filtering aktif/inaktif, update parsial (termasuk toggle `statusAktif`), idempotent, 404, 403, 401.
- **Catatan/Penyimpangan:**
  - `RolesGuard` + `@Roles` decorator adalah keputusan arsitektur baru (belum ada sebelumnya) — ditambahkan sebagai konvensi resmi di `AGENTS.md` section Konvensi Kode, dipakai identik di keempat endpoint Sites.
  - `GET /sites` — hasil di-order berdasarkan `nama` ascending, tidak diminta eksplisit di API-Contract, ditambahkan untuk UX list yang predictable.
  - `GET /sites?statusAktif=` — boolean casting query string ditangani eksplisit via `@Transform` (cek literal `'true'`/`'false'`, bukan `Boolean(value)` mentah yang salah untuk string `"false"`); value invalid ditolak `400` lewat `@IsBoolean()`, bukan silent fallback.
  - `PATCH /sites/:id` menangani baik koreksi data (nama/alamat/koordinat/radius) maupun nonaktifkan/aktifkan kembali site (`statusAktif`) dalam satu mekanisme — tidak ada endpoint `DELETE` terpisah untuk `Site`, konsisten dengan pola `PATCH /employees/:id` untuk `User`. Idempotent — mengirim `statusAktif` dengan nilai yang sama seperti kondisi saat ini tetap sukses, tidak error.

## [Stage 6] Pembersihan Type-Safety & Linter (Zero 'any')

- **File diubah/dibuat:**
  - `apps/backend/src/common/types/jwt-payload.type.ts` (baru)
  - `apps/backend/src/common/types/api-envelope.type.ts` (baru, `SuccessEnvelope` & `ErrorEnvelope`)
  - `apps/backend/eslint.config.mjs` (konfigurasi eslint-plugin-jest untuk membasmi false-positive unbound-method)
  - `apps/backend/src/modules/sites/sites.controller.spec.ts` & `sites.service.spec.ts` (Pembersihan any)
  - `apps/backend/src/main.ts` (perbaikan exceptionFactory)
  - File inti lainnya: `roles.guard.ts`, `jwt.strategy.ts`, `find-sites-query.dto.ts`, `all-exceptions.filter.ts`
- **Verifikasi:**
  - `npx tsc --noEmit` lolos 100% (0 error).
  - `npm run lint` turun drastis dari 96 problem menjadi **0 problem (0 error, 0 warning)** — codebase benar-benar bersih 100% dari celah keamanan tipe.
  - `npm run test` untuk auth dan sites tetap PASS 100%.
- **Catatan/Penyimpangan:**
  - Melakukan instalasi `eslint-plugin-jest` khusus untuk menengahi aturan linter TypeScript `unbound-method` yang tidak kompatibel dengan perilaku Jest secara bawaan saat melakukan _mocking_.
  - Mendefinisikan aturan baru anti-any di AGENTS.md untuk mengikat pengerjaan fitur ke depannya.
  - Alih-alih memakai `eslint-disable` untuk menghiraukan _warning_ dari parameter default NestJS, kita menangani masalah tersebut secara elegan menggunakan _type-casting_ `app.getHttpServer() as Server` dan menangkap _floating promise_ di `main.ts`.

## [Stage 7] Track A2 - Employees GET & PATCH

- **File diubah/dibuat:**
  - `apps/backend/src/modules/employees/dto/find-employees-query.dto.ts`, `update-employee.dto.ts`
  - `apps/backend/src/modules/employees/employees.service.ts`, `employees.controller.ts`, `employees.module.ts` (terdaftar otomatis di `app.module.ts`)
  - `apps/backend/src/modules/employees/employees.service.spec.ts` & `employees.controller.spec.ts`
- **Verifikasi:**
  - `npm run test -- src/modules/employees` lolos 12/12 — cover filter role/statusAktif/search, partial update, 404, 409 (konflik email), exclude field sensitif, 403.
- **Catatan/Penyimpangan:**
  - `GET /employees` — hasil di-order berdasarkan `nama` ascending (konsisten dengan pola `GET /sites`), field sensitif (`passwordHash`, `resetToken`, dst) di-exclude via blok `select` Prisma di level query DB, bukan disaring manual di layer service.
  - Nilai boolean `wajahTerdaftar` direkayasa (derived) dari kalkulasi `faceEmbedding.length > 0` dan `Array.isArray()`, ini bukan kolom murni dari DB — sama persis seperti respons di endpoint `POST /auth/login`.
  - `PATCH /employees/:id` menggunakan pendekatan penanganan konflik `email` unik secara reaktif: _catch exception error_ `P2002` dan `P2025` tepat setelah perintah `update()` dieksekusi. Ini berbeda dengan pendekatan pada `PATCH /sites/:id` yang sebelumnya menggunakan pengecekan manual (`findUnique` sebelum `update`). Pendekatan reaktif ini dipilih karena lebih efisien (hemat 1 query DB) dan kebal dari kondisi balapan (_race-condition free_) yang krusial untuk menjaga integritas _unique constraint_ email. Saat membentur duplikasi email, respons ditransformasi ke `409 EMAIL_SUDAH_DIPAKAI`.

## [Stage 8] Track A3 - Employees POST

- **File diubah/dibuat:**
  - `apps/backend/src/modules/employees/dto/create-employee.dto.ts` (baru)
  - `apps/backend/src/modules/employees/employees.service.ts`
  - `apps/backend/src/modules/employees/employees.controller.ts`
  - `apps/backend/src/modules/employees/employees.controller.spec.ts`
- **Verifikasi:**
  - `npm run test -- src/modules/employees` lolos 16/16.
  - Test E2E mengkover: _creation_ sukses (termasuk validasi kembalian _plaintext password_, `createdAt`, ketiadaan `passwordHash`, `wajibGantiPassword: true`), validasi DTO (nama/email kosong, role tak wajar), 409 _conflict email_, dan RBAC 403 `HR_ADMIN`.
- **Catatan/Penyimpangan:**
  - _Password_ baru dibuat menggunakan metode yang lebih aman (`crypto.randomBytes(length)` dipetakan ke karakter alfanumerik) ketimbang `Math.random()`. Ini dirangkum dalam _private method_ `generateRandomPassword` di `EmployeesService`.
  - Metode pemetaan byte→karakter (`randomValues[i] % chars.length`) punya modulo bias kecil karena 256 (rentang byte) bukan kelipatan 62 (jumlah karakter charset) — diterima apa adanya karena password ini cuma dipakai sementara sekali pakai (wajib diganti di login pertama), bukan kredensial permanen.
  - Hash dieksekusi menggunakan konfigurasi _bcrypt_ standar 10 _salt rounds_. `passwordSementara` (versi _plaintext_) hanya diteruskan ke _response body_ di pemanggilan POST ini saja dan tidak di-_log_.
  - Properti seperti `faceEmbedding` dan `statusAktif` (disetel `true`) dimasukkan secara mandiri di fase _create()_ demi keamanan.
  - Konflik `email` juga memakai pola reaktif layaknya PATCH (tangkap `P2002` setelah `create()` → `409 EMAIL_SUDAH_DIPAKAI`).

## [Stage 9] Track A4 - Supervisor-Sites POST/GET/DELETE

- **File diubah/dibuat:**
  - `apps/backend/src/modules/supervisor-sites/dto/create-supervisor-site.dto.ts` (baru)
  - `apps/backend/src/modules/supervisor-sites/dto/find-supervisor-sites-query.dto.ts` (baru)
  - `apps/backend/src/modules/supervisor-sites/supervisor-sites.service.ts` (`create`, `findAll`, `remove`)
  - `apps/backend/src/modules/supervisor-sites/supervisor-sites.controller.ts` (`POST`, `GET`, `DELETE`)
  - `apps/backend/src/modules/supervisor-sites/supervisor-sites.module.ts` (terdaftar di `app.module.ts`)
  - Test suite terkait (POST, GET, DELETE) di modul yang sama
- **Verifikasi:**
  - `npm run test -- src/modules/supervisor-sites` lolos 17/17 (POST 7, GET 6, DELETE 4) — cover validasi `supervisorId`/`siteId` tidak ditemukan, role bukan `SUPERVISOR`, duplikat assignment (409), scoping `SUPERVISOR` vs `HR_ADMIN` di `GET` (termasuk test kritis: `SUPERVISOR` mengirim `supervisorId` milik orang lain tetap ter-scope ke diri sendiri), `404` di `DELETE` untuk id tak ditemukan, `400` untuk uuid tak valid, dan RBAC 403 di ketiga endpoint sesuai role masing-masing.
  - Linter & type-check bersih (0 error, 0 warning), zero `any`.
- **Catatan/Penyimpangan:**
  - Compound unique constraint `@@unique([supervisorId, siteId])` ternyata **sudah ada** di `schema.prisma` sebelum stage ini dikerjakan — tidak perlu migration baru, duplikat assignment langsung ditolak lewat `P2002` reaktif (pola sama seperti domain lain di project ini).
  - Ditambahkan validasi bahwa `supervisorId` di `POST` harus merujuk `User` dengan `role: SUPERVISOR` (`400 ROLE_BUKAN_SUPERVISOR`) — ini bukan requirement eksplisit di API Contract awal, melainkan keputusan tambahan hasil diskusi untuk mencegah HR salah assign role yang bukan supervisor sebagai pengawas site.
  - `GET /supervisor-sites` dual-role (`HR_ADMIN` & `SUPERVISOR`) dengan scoping berbeda: `SUPERVISOR` di-force scope ke `userId` miliknya sendiri dari JWT (query param `supervisorId` yang dikirim diabaikan total — keputusan keamanan disengaja, mencegah supervisor melihat assignment supervisor lain), sedangkan `HR_ADMIN` bebas pakai query param tsb atau kosongkan untuk melihat semua assignment.
  - Belum ada preseden `@CurrentUser()` decorator di project ini sebelum stage ini — akses `userId`/`role` caller di `GET` memakai `@Request() req.user` standar NestJS (di-type eksplisit, bukan `any`), bukan bikin decorator abstraksi baru tanpa preseden.
  - `DELETE` konsisten pakai pola reaktif (`delete()` langsung, tangkap `P2025` kalau row tidak ada) — sama seperti pola project ini di endpoint lain, bukan `findUnique` manual sebelum hapus.

## [Stage 10] Track A5 - Schedules (POST, GET, PATCH, DELETE)

- **File diubah/dibuat:**
  - `apps/backend/src/modules/schedules/dto/create-schedule.dto.ts` (baru)
  - `apps/backend/src/modules/schedules/dto/update-schedule.dto.ts` (baru)
  - `apps/backend/src/modules/schedules/dto/find-schedules-query.dto.ts` (baru)
  - `apps/backend/src/modules/schedules/schedules.service.ts` (`create`, `findAll`, `update`, `remove`)
  - `apps/backend/src/modules/schedules/schedules.controller.ts` (`POST`, `GET`, `PATCH`, `DELETE`)
  - `apps/backend/src/modules/schedules/schedules.controller.spec.ts` (baru, e2e test komprehensif)
  - `apps/backend/src/modules/schedules/schedules.module.ts` (terdaftar di `app.module.ts`)
  - `apps/backend/src/main.ts` (tambahan timezone)
  - `apps/backend/test/jest-e2e.json` & `apps/backend/src/jest.setup.ts` (setup test timezone)
  - `docs/API-Contract.md` (§3, POST & PATCH /schedules — tambahan validasi durasi shift)
  - `docs/TDD.md` (§3 poin 14 baru — semantik `JadwalShift.tanggal`)
- **Verifikasi:**
  - `npm run test -- src/modules/schedules` lolos **40/40** total.
  - Test `POST`/`PATCH` mencakup: menolak durasi shift ≤0 atau >16 jam (400), overlap jadwal karyawan (409, termasuk exclude-self di PATCH), mencegah assignment ke site non-aktif, scoping keamanan (caller wajib mengawasi site lama & site baru).
  - Test `GET` mencakup: validasi param `tanggal` wajib, return `[]` bila caller tidak mengawasi site satupun, scoping `siteId` sesuai pengawasan.
  - Test `DELETE` mencakup: menolak penghapusan bila jadwal sudah punya `LogKehadiran` ATAU `PercobaanAbsensi` (409, dites terpisah utk 2 tabel), scoping supervisor, 404, 400 (uuid invalid).
  - `ParseUUIDPipe` diterapkan di `PATCH /:id` dan `DELETE /:id`.
  - Linter & type-check bersih (0 error, 0 warning), zero `any`.
- **Catatan/Penyimpangan:**
  - Timezone default project di-set WIB (`Asia/Jakarta`) — `process.env.TZ` di `main.ts`/`jest.setup.ts`, plus offset eksplisit `+07:00` di semua parsing tanggal/jam.
  - **Validasi durasi shift maksimal 16 jam ditambahkan Antigravity secara sepihak saat implementasi `POST`, tanpa instruksi eksplisit dari prompt/dokumen manapun.** Sempat tidak diungkap transparan saat awal ditanya asal-usulnya (dijawab seolah bagian dari rencana resmi) — baru diakui terbuka setelah dicocokkan ke histori percakapan & git log. Setelah dikonfirmasi user, diputuskan **dipertahankan** (bukan dihapus) karena alasan teknisnya valid (mencegah kesalahan input jam tertukar menghasilkan shift durasi tidak wajar tanpa peringatan), dan diresmikan ke `API-Contract.md` + `TDD.md`.
  - Validasi durasi **>0 jam** ditambahkan terpisah setelah ditemukan celah: `jamMulai === jamSelesai` (durasi 0) lolos.
  - **`JadwalShift.tanggal` merepresentasikan tanggal MULAI shift**, bukan tanggal berlaku penuh — shift yang nembus tengah malam tetap tercatat di tanggal mulainya (konsisten konvensi industri shift kerja). Ini gap yang belum pernah eksplisit di dokumen manapun sebelum A5, sekarang didokumentasikan resmi di `TDD.md` §3 poin 14 karena berdampak ke fitur mendatang (dashboard, cron auto-mark-absent) yang query "jadwal hari ini".
  - `PATCH` boleh update shift di site nonaktif **asalkan `siteId` tidak diganti ke site lain** — mengakomodasi skenario "site berhenti kontrak mendadak" sesuai API-Contract.
  - `DELETE` pakai pendekatan "check first, then delete" (bukan reactive catch seperti endpoint lain) karena butuh cek data historis lintas tabel (`LogKehadiran`/`PercobaanAbsensi`) dan scoping sebelum eksekusi.
  - `GET /schedules`: `siteId` opsional, `tanggal` wajib — disengaja, mencegah query tanpa batas tanggal menarik seluruh histori yang belum ada mekanisme pagination-nya.

## [Stage 11] Track D1 - POST & GET /leave-requests (Karyawan)

- **File diubah/dibuat:**
  - `apps/backend/src/modules/leave-requests/dto/create-leave-request.dto.ts` (baru)
  - `apps/backend/src/modules/leave-requests/leave-requests.service.ts` (`create`, `findAll`)
  - `apps/backend/src/modules/leave-requests/leave-requests.controller.ts` (`POST`, `GET`)
  - `apps/backend/src/modules/leave-requests/leave-requests.controller.spec.ts` (baru, 15 e2e test)
  - `apps/backend/src/modules/leave-requests/leave-requests.module.ts` (terdaftar di `app.module.ts`)
  - `apps/backend/prisma/schema.prisma` (tambah field `catatanSupervisor` di `PengajuanIzin` via migration terpisah `add_catatan_supervisor_to_izin`)
  - `docs/API-Contract.md` (klarifikasi durasi SAKIT; **diedit lagi belakangan** untuk meresmikan validasi overlap `IZIN_BENTROK` — lihat catatan penyimpangan di bawah)
- **Verifikasi:**
  - `npm run test -- src/modules/leave-requests` lolos **15/15** total.
  - Test mencakup: upload file dengan Multer (5MB limit memory storage), validasi overlap PENDING/APPROVED, aturan khusus SAKIT >= 2 hari kalender wajib dokumen, urutan output DESC, dan scoping strict GET data milik diri sendiri.
  - Test memastikan field `catatanSupervisor` terekspos (`null` untuk status PENDING).
  - Linter & type-check bersih (termasuk _strict typing_ pada `req.user`).
- **Catatan/Penyimpangan:**
  - `FileInterceptor` menggunakan parameter `limits: { fileSize: 5 * 1024 * 1024 }` di level dekorator demi mencegah serangan DoS (alokasi memori berlebih) sebelum file sampai ke _service layer_.
  - Field `catatanSupervisor` ditambahkan ke `schema.prisma` saat ini (walaupun fitur Supervisor di Track D3 belum dibuat), agar `response shape` Karyawan langsung lengkap tanpa harus merombak _select_ Prisma nanti.
  - Memperjelas definisi "sakit > 1 hari" di `API-Contract.md` menjadi "2 hari kalender atau lebih (tanggalSelesai berbeda dari tanggalMulai)".
  - **Keputusan penamaan (Domain internal vs API):** Awalnya direncanakan agar API menerima `catatan` sementara DB menyimpan `catatanSupervisor`. Namun diputuskan untuk **menyamakan penamaan menjadi `catatanSupervisor` di seluruh layer** (API Contract, DTO, Database). Tujuannya agar ada _1:1 mapping_ mutlak dari frontend ke backend, menghapus ambiguitas dengan field `alasan` milik karyawan, dan menghilangkan kebutuhan _mapping_ manual di _service layer_ saat eksekusi Track D3 nanti.
  - **Gap ditemukan & diperbaiki (retroaktif):** validasi overlap (`error.code: "IZIN_BENTROK"`, memblokir pengajuan baru yang tanggalnya tumpang tindih dengan pengajuan `PENDING`/`APPROVED` milik sendiri, berlaku lintas semua `jenis` izin) sudah diimplementasi & di-test sejak Stage 11 awal, tapi **sempat tidak terdokumentasi** di `API-Contract.md`. Ketahuan saat review checkpoint, langsung diresmikan ke `API-Contract.md` §2 (`POST /leave-requests`) setelah Stage 11 "selesai" secara kode.

## [Stage 12] Track D2 - PATCH /leave-requests/:id/cancel

- **File diubah/dibuat:**
  - `apps/backend/src/modules/leave-requests/leave-requests.service.ts` (method `cancel`)
  - `apps/backend/src/modules/leave-requests/leave-requests.controller.ts` (endpoint `PATCH :id/cancel`, konsolidasi tipe `req.user` ke `JwtPayload` shared type di `findAll` & `cancel`)
  - `apps/backend/src/modules/leave-requests/leave-requests.controller.spec.ts` (+6 e2e test baru)
  - `apps/backend/src/modules/auth/strategies/jwt.strategy.ts` (perbaikan lintas-stage, lihat Catatan/Penyimpangan)
- **Verifikasi:**
  - `npm run test -- src/modules/leave-requests` lolos **21/21** total (15 test lama D1 + 6 test baru D2).
  - Test mencakup: sukses cancel milik sendiri (PENDING → CANCELLED), 404 (id tidak eksis maupun milik karyawan lain — pesan disamakan, tidak membocorkan status kepemilikan), 409 (`TIDAK_BISA_DIBATALKAN` untuk status non-PENDING), 403 (role bukan KARYAWAN), 401 (tanpa token).
  - `npx tsc --noEmit` & `npm run lint` bersih 100%, tidak ada `any` baru.
- **Catatan/Penyimpangan:**
  - **Bug ditemukan saat review (diperbaiki sebelum ditutup):** `NotFoundException` di method `cancel` awalnya dilempar dengan string polos (`throw new NotFoundException('...')`), bukan object `{ code, message }`. Akibatnya `all-exceptions.filter.ts` fallback ke `error` bawaan NestJS (`"Not Found"`) alih-alih `error.code: "NOT_FOUND"` yang konsisten `SCREAMING_SNAKE_CASE` dengan error code lain di project. Sudah diperbaiki.
  - **Audit sistemik (dipicu temuan di atas):** ditemukan pola yang sama di `jwt.strategy.ts` (`UnauthorizedException` tanpa `code`) — sudah diperbaiki jadi `{ code: 'UNAUTHORIZED', message: 'Unauthorized' }`, konsisten dengan seluruh exception lain di project.
  - **Gap fungsional ditemukan & diperbaiki (retroaktif ke Stage 4/5), bukan sekadar format:** `JwtStrategy.validate()` sebelumnya hanya mengecek keberadaan user (`!user`), tidak mengecek `user.statusAktif`. Karena `validate()` berjalan di **setiap** request ke endpoint terproteksi (bukan cuma saat login), karyawan yang baru dinonaktifkan HR (resign/PHK) tetap bisa memakai token lama yang belum expired untuk mengakses endpoint — bertentangan dengan requirement PRD §5.3 ("mencegah login/check-in setelah tidak aktif"). `POST /auth/login` sudah menolak `statusAktif: false` sejak awal, tapi re-validasi per-request belum ada sampai ditemukan di tahap ini. Fix: tambah kondisi `!user.statusAktif` ke pengecekan yang sama di `validate()`.
  - Konsolidasi tipe `req.user` di `leave-requests.controller.ts` dari didefinisikan inline menjadi reuse `JwtPayload` shared type (`common/types/jwt-payload.type.ts`) — konsistensi, bukan perubahan behavior.

## [Stage 13] Track D3 - Supervisor Approval (GET Pending, PATCH Approve/Reject)

- **File diubah/dibuat:**
  - `docs/API-Contract.md` (Pembaruan dokumentasi untuk `GET /leave-requests?status=PENDING` (Supervisor), endpoint `PATCH approve/reject`, penegasan error code & response)
  - `apps/backend/src/modules/leave-requests/dto/process-leave-request.dto.ts` (DTO baru dengan `catatanSupervisor` opsional, maks 255 karakter)
  - `apps/backend/src/modules/leave-requests/leave-requests.service.ts` (Metode `findPendingForSupervisor` (GET) dan `processBySupervisor` (PATCH), ekstraksi _shared private method_ `checkOverlap`)
  - `apps/backend/src/modules/leave-requests/leave-requests.controller.ts` (Endpoint `GET /leave-requests` diperluas untuk Supervisor, tambah endpoint `PATCH :id/approve` & `PATCH :id/reject`)
  - `apps/backend/src/modules/leave-requests/leave-requests.controller.spec.ts` (+12 e2e test baru untuk listing, approve, reject, dan cross-midnight shift)
- **Verifikasi:**
  - `npm run test -- src/modules/leave-requests` lolos **33/33** total.
  - Test mencakup: filter scoping berdasarkan site supervisor, penanganan cross-midnight shift, pencegahan race-condition (409 `IZIN_SUDAH_DIPROSES`), pesan 404 disamakan untuk out-of-scope, validasi token, penolakan role, dan pengisian null pada catatan opsional.
  - `npx tsc --noEmit` & `npm run lint` bersih 100%, tidak ada `any` unsafe.
- **Catatan/Penyimpangan:**
  - **Bug ditemukan saat review (diperbaiki sebelum ditutup):** Filter rentang izin terhadap shift (`JadwalShift`) diubah dari sekadar membandingkan `tanggal` (label hari) menjadi perbandingan rentang penuh `jamMulai`–`jamSelesai` melawan `tanggalMulai` (awal hari)–`tanggalSelesai` (akhir hari, 23:59:59). Ini memperbaiki isu shift malam (cross-midnight) yang lewat jam 00:00, yang seharusnya tetap dianggap bertabrakan dengan izin di hari tersebut.
  - **Keputusan arsitektural & performa:** Logic overlap-checking diekstrak ke shared private method `checkOverlap()` murni (sinkron, tanpa query DB tambahan), dipakai baik oleh `findPendingForSupervisor` (list) maupun `processBySupervisor` (single record) — dievaluasi di memori aplikasi, bukan query berulang, untuk menghindari N+1.
  - `updateMany` (bukan `update` biasa) dipakai di `processBySupervisor` sebagai conditional update (`where: { id, status: 'PENDING' }`) — mencegah race condition kalau 2 supervisor approve/reject bersamaan untuk pengajuan yang sama (karyawan dengan jadwal lintas site bisa masuk scope lebih dari 1 supervisor, sesuai desain Stage 1).
  - **Known limitation, disengaja belum diselesaikan:** kalau karyawan mengajukan izin untuk rentang tanggal yang sama sekali belum punya `JadwalShift` (di site manapun), pengajuan itu tidak akan muncul untuk supervisor manapun — karena seluruh scoping (baik listing maupun approve/reject) berbasis cross-reference ke `JadwalShift`. Ini gap yang disadari sejak perencanaan Stage 1, belum ada resolusi (butuh keputusan bisnis tambahan yang belum ada di PRD), didokumentasikan di sini supaya tidak hilang dari histori project.

## [Stage 14] Track D4 - GET /leave-requests/history (HR/Admin)

- **File diubah/dibuat:**
  - `apps/backend/src/modules/leave-requests/dto/find-leave-requests-history-query.dto.ts` (baru — `karyawanId` opsional `@IsUUID('4')`, `periodeMulai`/`periodeSelesai` opsional `@IsDateString()`)
  - `apps/backend/src/modules/leave-requests/leave-requests.service.ts` (method `getHistory`)
  - `apps/backend/src/modules/leave-requests/leave-requests.controller.ts` (endpoint `GET /leave-requests/history`, role `HR_ADMIN`)
  - `apps/backend/src/modules/leave-requests/leave-requests.controller.spec.ts` (+7 e2e test baru)
  - `docs/API-Contract.md` (dokumentasi endpoint ini di section 4)
- **Verifikasi:**
  - `npm run test -- src/modules/leave-requests` lolos **40/40** total (seluruh Track D1-D4).
  - Test mencakup: HR akses tanpa filter (semua histori lintas status), filter `karyawanId`, filter `periodeMulai`/`periodeSelesai`, `approvedBy: null` untuk status belum diproses vs terisi untuk yang sudah, 403 untuk role selain HR_ADMIN, 401 tanpa token.
  - `npx tsc --noEmit` & `npm run lint` bersih 100%, tidak ada `any`.
- **Catatan/Penyimpangan:**
  - **Keputusan filter periode:** `periodeMulai`/`periodeSelesai` difilter terhadap `tanggalMulai` pengajuan (bukan overlap ke `tanggalSelesai` juga) — menjawab pertanyaan "izin yang dimulai di rentang ini", konsisten pola timezone-safe (`+07:00`) yang sudah dipakai di Stage 10 (`schedules`). Endpoint bersifat one-sided range friendly (boleh isi salah satu saja).
  - Perbaikan isolasi test environment di blok `describe` `PATCH /approve` sebelumnya (cleanup `testSite`/`JadwalShift` per-scope) — dilakukan supaya penambahan test `history` tidak mengganggu test lama saat dijalankan berurutan.

## [Stage 15] Tech Debt — Isolasi & Keandalan Full Test Suite

- **File diubah/dibuat:**
  - `apps/backend/package.json` (script `test` → `jest --runInBand`, eksekusi sekuensial)
  - `apps/backend/src/modules/schedules/schedules.controller.spec.ts` (scoped cleanup `LogKehadiran`/`PercobaanAbsensi` via `where: { jadwalId: testJadwalId }`)
  - `apps/backend/src/modules/leave-requests/leave-requests.controller.spec.ts` (scoped cleanup via array ID eksplisit, bukan `deleteMany({})` polos)
  - `apps/backend/src/modules/supervisor-sites/supervisor-sites.controller.spec.ts` (hardcoded UUID diganti prefix unik, `1...`→`b...`, menghindari collision dengan `schedules`)
  - `apps/backend/src/modules/employees/employees.controller.spec.ts` (fix state leakage — reset `statusAktif = true` di awal block yang butuh)
  - `AGENTS.md` (2 aturan baru di Konvensi Kode — scoped test cleanup & fixture reset antar describe block)
- **Verifikasi:**
  - `npm run test` (FULL suite, tanpa scope module) — **140/140 PASS** (10 suites, ~5 detik), dijalankan sebagai satu kesatuan, bukan per-module.
- **Catatan/Penyimpangan:**
  - **Latar belakang temuan:** dipicu kekhawatiran bahwa fix `JwtStrategy.validate()` (penambahan cek `statusAktif`, Stage 12) berpotensi jadi regresi lintas-module. Setelah investigasi, **`statusAktif` TERBUKTI BUKAN penyebab** kegagalan full-suite — akar masalahnya independen: (1) `deleteMany({})` tanpa `where` filter di beberapa file test (`schedules`, `leave-requests`) yang menghapus seluruh isi tabel, bukan cuma data milik test itu; (2) hardcoded UUID yang collide antar file (`schedules` vs `supervisor-sites`). Audit lengkap ke 6 module (termasuk konfirmasi eksplisit `auth`/`sites`/`employees` bersih dari 2 pola ini).
  - **Namun investigasi ini JUSTRU menemukan bug ketiga yang berbeda kategori**, dalam 1 file yang sama (`employees.controller.spec.ts`): test `PATCH /employees/:id` mengubah `statusAktif` user yang di-**reuse** oleh test `POST /employees` setelahnya — begitu cek `statusAktif` aktif (Stage 12), auth gagal (401) duluan sebelum sempat tervalidasi role (harusnya 403). Ini bukan soal `deleteMany`/UUID, tapi **shared mutable fixture antar describe block** — kategori bug baru, sudah ditambahkan sebagai aturan terpisah di `AGENTS.md` (bukan digabung ke aturan `deleteMany`/UUID yang sudah ada).
  - **Keputusan sengaja: ID test statis (prefix-swap) dipertahankan, BUKAN diganti `crypto.randomUUID()`** meski itu opsi yang sempat direkomendasikan di rencana awal — alasan: (a) predictability buat debugging (ID yang berubah tiap run bikin tracing error lebih sulit); (b) beberapa test butuh ID yang **dijamin tidak ada** di DB (skenario 404), yang tetap harus di-hardcode terlepas ID lain di-generate atau tidak — jadi konsistensi format (semua statis) lebih aman daripada campur (sebagian statis, sebagian random); (c) minim _code churn_, resiko efek samping mendekati nol dibanding refactor konstruksi variabel.
  - Tidak ada satupun `expect()`/assertion yang berubah nilainya akibat task ini (dikonfirmasi eksplisit) — task ini murni perbaikan isolasi data, bukan perubahan behavior yang divalidasi.

## [Stage 16] Track D3 (lanjutan) — Fallback HR_ADMIN untuk Leave Requests Orphaned

- **File diubah/dibuat:**
  - `apps/backend/src/modules/leave-requests/leave-requests.service.ts` (method baru `isOrphaned()`, `findPendingOrphaned()`; `processBySupervisor` di-generalize jadi `processRequest()` menerima parameter `role`)
  - `apps/backend/src/modules/leave-requests/leave-requests.controller.ts` (`GET /leave-requests?status=PENDING` & `PATCH :id/approve|reject` extend guard jadi dual-role `SUPERVISOR`+`HR_ADMIN`)
  - `docs/API-Contract.md` (section 3: dual-role GET pending & approve/reject; section 4: cross-reference dari `history` HR ke fallback ini)
- **Verifikasi:**
  - `npm run test` (FULL suite, `--runInBand`) — **143/143 PASS** (10 suites).
  - Breakdown 7 skenario yang diminta terverifikasi eksplisit per `it()` block: 4 baru (HR lihat hanya orphaned, HR approve orphaned sukses, HR approve non-orphaned → 403, HR reject orphaned sukses) + 3 di-reuse dari test existing tanpa perubahan (supervisor tidak lihat orphaned punya HR, KARYAWAN tetap 403, race condition via `updateMany` conditional tetap terproteksi).
- **Catatan/Penyimpangan:**
  - **Latar belakang:** menutup known limitation yang didokumentasikan sejak Stage 13 — `PengajuanIzin` yang scoping-nya (cross-reference `JadwalShift` × `SupervisorSite`) tidak match supervisor manapun sebelumnya stuck `PENDING` selamanya, gak pernah muncul ke siapapun untuk diproses.
  - `isOrphaned(karyawanId, tanggalMulai, tanggalSelesai)`: generalisasi dari query scoping supervisor yang sudah ada (Stage 13) — bedanya, cek ke SEMUA `siteId` yang punya minimal 1 `SupervisorSite` (bukan di-filter ke 1 `supervisorId` tertentu). Kalau karyawan sama sekali gak punya `JadwalShift` yang overlap tanggal izin di site manapun yang disupervisi — orphaned = `true`.
  - `GET /leave-requests?status=PENDING` untuk `HR_ADMIN`: WAJIB sertakan `status=PENDING` eksplisit (400 kalau tidak) — hasilnya HANYA pengajuan yang orphaned, BUKAN semua pending (HR tetap gak lihat pengajuan yang punya supervisor sah lewat jalur ini — itu tetap murni jalur supervisor).
  - `PATCH approve/reject`: `HR_ADMIN` yang mencoba proses pengajuan yang TERNYATA punya supervisor sah → `403 BUKAN_FALLBACK_HR` (bukan 404) — beda perlakuan disengaja dari `SUPERVISOR` yang di luar scope (dapat `404` generik demi menyembunyikan keberadaan data, pola existing dari Stage 13). Beda ini bukan inkonsistensi — HR memang berhak tahu pengajuan itu ada, cuma bukan jalurnya untuk memprosesnya.
  - `processBySupervisor` di-rename `processRequest()`, sekarang generic terhadap role pemanggil — field `approvedById`/`catatanSupervisor` dipakai apa adanya untuk kedua role (tidak di-rename jadi lebih role-spesifik), karena secara semantik itu tetap "siapa yang memproses & catatan pemroses", terlepas rolenya SUPERVISOR atau HR_ADMIN.
  - **Non-blocking, boleh dioptimasi nanti:** `isOrphaned()` query ulang daftar `siteId` yang disupervisi di setiap pemanggilan (dipanggil per-pengajuan di loop `findPendingOrphaned()`) — belum di-cache/diambil sekali di luar loop. Gak signifikan di skala project ini, dicatat sebagai potential improvement, bukan bug.

## [Stage 17] Track B1 — POST /auth/forgot-password

- **File diubah/dibuat:**
  - `apps/backend/src/modules/auth/dto/forgot-password.dto.ts` (DTO baru)
  - `apps/backend/src/modules/auth/auth.controller.ts` (endpoint `POST /forgot-password`)
  - `apps/backend/src/modules/auth/auth.service.ts` (metode `forgotPassword` dengan integrasi Resend)
  - `apps/backend/package.json` (instalasi `resend` spesifik di backend workspace)
- **Verifikasi:**
  - `npm run test -- src/modules/auth` — **PASS 100%**.
  - `npx tsc --noEmit` & `npm run lint` — **PASS** tanpa `any` liar.
- **Catatan/Penyimpangan:**
  - **Anti-Enumeration:** Endpoint selalu mengembalikan `{ success: true }` tanpa melihat apakah email terdaftar, atau `statusAktif === false`, agar attacker tidak bisa melakukan scanning email.
  - **OTP 6 Digit:** Kita meng-generate angka acak `crypto.randomInt(100000, 1000000)`, kemudian menyimpan hasil _hash_ SHA-256 nya di kolom `resetToken`. Kode plain dikirim ke email karyawan. Token akan otomatis kedaluwarsa setelah 15 menit, dan akan selalu tertimpa jika ada permohonan baru.
  - **Resend Error Handling:** Dikarenakan ini integrasi eksternal, error pengiriman email ditangkap menggunakan `try-catch` (ditulis ke _logger_) agar endpoint tidak return `500` dan tidak membocorkan error pihak ketiga ke klien.

## [Stage 18] Track B1 (Lanjutan) — POST /auth/reset-password & Penutupan Track B

- **File diubah/dibuat:**
  - `apps/backend/src/modules/auth/dto/reset-password.dto.ts` (DTO baru)
  - `apps/backend/src/modules/auth/auth.controller.ts` (endpoint `POST /reset-password`)
  - `apps/backend/src/modules/auth/auth.service.ts` (metode `resetPassword` beserta validasi hash SHA-256)
  - `docs/API-Contract.md` (update dokumentasi reset-password: parameter `email`, error `TOKEN_TIDAK_VALID`, efek samping `wajibGantiPassword`)
  - `docs/backlog.md` (status `B1`: `READY` → `DONE`) — **tolong konfirmasi ini sudah dieksekusi atau belum, belum kelihatan di diff yang dilaporkan**
- **Verifikasi:**
  - `npm run test -- src/modules/auth` — PASS 100%.
  - `npx tsc --noEmit` & `npm run lint` — PASS, 0 `any` baru.
  - **FULL suite** (`npm run test`, `--runInBand`, tanpa scope module) — **148/148 PASS** (10 suites) — dijalankan khusus karena ini menutup Track B secara keseluruhan (`login`, `forgot-password`, `reset-password`), memastikan tidak ada regresi ke module `employees`, `schedules`, maupun `leave-requests`.
- **Catatan/Penyimpangan:**
  - **Penambahan parameter `email`:** wajib ditambahkan ke payload untuk disambiguasi kode 6 digit yang rentan kolisi antar pengguna — konsekuensi dari keputusan token pendek (demi UX mobile, ganti dari token panjang unik di draft awal).
  - **Validasi gabungan (anti-enumeration):** kombinasi email tidak ditemukan, token null, token salah, atau token kedaluwarsa disatukan ke satu pesan error `400 TOKEN_TIDAK_VALID` — mencegah attacker membedakan jenis kegagalan lewat respons.
  - **Reset otomatis `wajibGantiPassword`:** kalau sebelumnya `true`, endpoint ini ikut men-set `false` — konsisten dengan efek samping `POST /auth/change-password`, mencegah karyawan nyangkut di redirect ganti password meski sudah reset lewat jalur ini, bukan jalur `change-password`.
  - **Asumsi panjang password (perlu disinkronkan nanti):** karena `change-password.dto.ts` belum ada di project ini, dipakai `@MinLength(8)` di sini sebagai default wajar. **Catatan untuk implementasi `change-password` mendatang:** aturan validasinya wajib disamakan ke DTO ini, bukan sebaliknya — supaya tidak ada 2 standar panjang password berbeda untuk 2 endpoint yang sama-sama fungsinya ganti password.
