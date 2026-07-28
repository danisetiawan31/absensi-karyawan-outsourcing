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
