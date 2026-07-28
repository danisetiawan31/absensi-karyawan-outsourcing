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
