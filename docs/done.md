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
