# Log Pengerjaan

## [Stage 1] Inisialisasi NestJS & NPM Workspaces

- **Fitur:** Setup monorepo npm workspace (`apps/backend`, `apps/mobile`) & NestJS scaffold.
- **Komponen:** `package.json`, `apps/backend/src/`.
- **Verifikasi:** Workspaces terhubung, build NestJS bersih.
- **Keputusan:** Merge manual scaffold CLI untuk mempertahankan struktur `prisma` & `common`.

## [Stage 2] Setup Tooling Prisma

- **Fitur:** Inisialisasi Prisma ORM di `apps/backend`.
- **Komponen:** `prisma/schema.prisma`, `apps/backend/package.json`.
- **Verifikasi:** `npx prisma generate` sukses.

## [Stage 3] Setup Docker Postgres & Migration

- **Fitur:** Container PostgreSQL via Docker Compose & migrasi skema awal Prisma.
- **Komponen:** `docker-compose.yml`, `prisma/migrations/`.
- **Verifikasi:** Container berjalan, `prisma migrate dev` PASS.
- **Keputusan:** Lock Prisma ke versi `6.4.1` (stabil) untuk menghindari breakage properti `url`.

## [Stage 4] Auth Login & JWT Infrastructure

- **Fitur:** Endpoint `POST /auth/login` & autentikasi JWT Strategy.
- **Komponen:** `modules/auth/`, `common/guards/`, `common/prisma/`.
- **Verifikasi:** 6/6 test PASS.
- **Keputusan:** Module `PrismaModule` dibuat terpusat di `common/prisma`.

## [Stage 5] Track A1 — Sites CRUD & RolesGuard

- **Fitur:** Endpoint CRUD Site (`/sites`) & guard otorisasi berbasis role (`@Roles()`).
- **Komponen:** `modules/sites/`, `common/guards/roles.guard.ts`.
- **Verifikasi:** 20/20 test PASS.
- **Keputusan:** List di-order `nama` ASC; query boolean `statusAktif` di-transform eksplisit via `@Transform`.

## [Stage 6] Pembersihan Type-Safety & Linter (Zero 'any')

- **Fitur:** Pengetatan aturan ESLint & TypeScript (zero `any` policy) di backend.
- **Komponen:** `eslint.config.mjs`, `tsconfig.json`, `src/common/`.
- **Verifikasi:** `tsc --noEmit` & `npm run lint` 100% bersih.

## [Stage 7] Track A2 — Employees GET & PATCH

- **Fitur:** Endpoint `GET /employees` & `PATCH /employees/:id`.
- **Komponen:** `modules/employees/`.
- **Verifikasi:** 12/12 test PASS.
- **Keputusan:** Properti `wajahTerdaftar` direkayasa dari `faceEmbedding.length > 0`; Prisma error `P2002`/`P2025` ditangani reaktif.

## [Stage 8] Track A3 — Employees POST

- **Fitur:** Endpoint `POST /employees` (penambahan karyawan baru oleh HR).
- **Komponen:** `modules/employees/`.
- **Verifikasi:** 16/16 test PASS.
- **Keputusan:** Password sementara dibuat via `crypto.randomBytes` & di-hash bcrypt (10 salt rounds); return plaintext `passwordSementara` HANYA pada response POST ini.

## [Stage 9] Track A4 — Supervisor-Sites POST/GET/DELETE

- **Fitur:** Endpoint alokasi pengawasan site supervisor (`/supervisor-sites`).
- **Komponen:** `modules/supervisor-sites/`.
- **Verifikasi:** 17/17 test PASS.
- **Keputusan:** Scoping dual-role (`SUPERVISOR` di-lock murni ke `userId` sendiri, `HR_ADMIN` bebas filter).

## [Stage 10] Track A5 — Schedules (POST, GET, PATCH, DELETE)

- **Fitur:** Endpoint CRUD jadwal shift kerja (`/schedules`).
- **Komponen:** `modules/schedules/`, `common/utils/date.util.ts`.
- **Verifikasi:** 40/40 test PASS.
- **Keputusan:** Durasi shift dibatasi 1–16 jam; `JadwalShift.tanggal` mengunci tanggal MULAI shift (WIB +07:00).

## [Stage 11] Track D1 — POST & GET /leave-requests (Karyawan)

- **Fitur:** Pengajuan & riwayat izin/cuti karyawan (`/leave-requests`).
- **Komponen:** `modules/leave-requests/`, `schema.prisma`.
- **Verifikasi:** 15/15 test PASS.
- **Keputusan:** File upload dibatasi max 5MB di level `FileInterceptor`; validasi overlap `IZIN_BENTROK` di-enforce di backend.

## [Stage 12] Track D2 — PATCH /leave-requests/:id/cancel

- **Fitur:** Pembatalan izin PENDING oleh karyawan.
- **Komponen:** `modules/leave-requests/`.
- **Verifikasi:** 21/21 test PASS.
- **Keputusan:** User nonaktif ditolak reaktif di `JwtStrategy.validate()`.

## [Stage 13] Track D3 — Supervisor Approval (GET Pending, PATCH Approve/Reject)

- **Fitur:** Persetujuan/penolakan pengajuan izin karyawan oleh Supervisor.
- **Komponen:** `modules/leave-requests/`.
- **Verifikasi:** 33/33 test PASS.
- **Keputusan:** Filter overlap shift malam dihitung rentang `jamMulai`–`jamSelesai` penuh; update status menggunakan `updateMany` conditional murni.

## [Stage 14] Track D4 — GET /leave-requests/history (HR/Admin)

- **Fitur:** Riwayat seluruh pengajuan izin untuk HR_ADMIN.
- **Komponen:** `modules/leave-requests/`.
- **Verifikasi:** 40/40 test PASS.
- **Keputusan:** Periode difilter berdasar `tanggalMulai` dengan timezone safe WIB.

## [Stage 15] Tech Debt — Isolasi & Keandalan Full Test Suite

- **Fitur:** Refactoring isolasi data test (cleanup scoped per-file, ID test unik).
- **Komponen:** `modules/*/spec.ts`, `AGENTS.md`.
- **Verifikasi:** 140/140 test PASS.
- **Keputusan:** Dilarang `deleteMany({})` tanpa filter; ID statis unik dipertahankan untuk keandalan debugging.

## [Stage 16] Track D3 (lanjutan) — Fallback HR_ADMIN untuk Leave Requests Orphaned

- **Fitur:** Fallback approval oleh `HR_ADMIN` untuk pengajuan izin tanpa supervisor (orphaned).
- **Komponen:** `modules/leave-requests/`.
- **Verifikasi:** 143/143 test PASS.
- **Keputusan:** Scoping non-orphaned ditolak dengan `403 BUKAN_FALLBACK_HR` untuk HR_ADMIN.

## [Stage 17] Track B1 — POST /auth/forgot-password

- **Fitur:** Permintaan OTP reset password via email.
- **Komponen:** `modules/auth/`.
- **Verifikasi:** Test suite PASS.
- **Keputusan:** Anti-enumeration: selalu merespons 200 OK generik; OTP 6-digit di-hash SHA-256 (expired 15 menit).

## [Stage 18] Track B1 (Lanjutan) — POST /auth/reset-password

- **Fitur:** Eksekusi reset password dengan OTP 6-digit.
- **Komponen:** `modules/auth/`.
- **Verifikasi:** 148/148 test PASS.
- **Keputusan:** Menambah param `email` untuk disambiguasi OTP; reset otomatis flag `wajibGantiPassword` ke `false`.

## [Stage 19] Maintenance — Press done.md & Extend AGENTS.md

- **Fitur:** Penataan dokumentasi & konsolidasi 5 aturan inti ke `AGENTS.md` §7.
- **Komponen:** `AGENTS.md`, `docs/TDD.md`, `docs/done.md`.

## [Stage 20] Track C1 — Face Verification Microservice (Python + DeepFace)

- **Fitur:** Microservice verifikasi wajah & anti-spoofing liveness (`POST /internal/embed`).
- **Komponen:** `apps/face-service/` (FastAPI + DeepFace + MTCNN).
- **Keputusan:** Gunakan detector `mtcnn` untuk menghindari ketergantungan XML OpenCV pada headless environment.

## [Stage 21] Track C2 — POST /users/me/face-registration

- **Fitur:** Endpoint pendaftaran embedding wajah karyawan.
- **Komponen:** `modules/face-verification/`.
- **Verifikasi:** 157/157 test PASS.
- **Keputusan:** Mocking HTTP call ke python service di unit test untuk performa CI/CD.

## [Stage 22] Track C3 — POST /attendance/check-in & POST /attendance/check-out

- **Fitur:** Endpoint check-in & check-out absensi (verifikasi lokasi Haversine + embedding wajah Facenet).
- **Komponen:** `modules/attendance/`, `common/utils/geo.util.ts`, `common/utils/vector.util.ts`.
- **Verifikasi:** 184/184 test PASS.
- **Keputusan:** Pemisahan pipeline result (HTTP 200 dengan status verifikasi) vs precondition error (HTTP 400/404/409); cosine distance threshold 0.40.

## [Stage 23] Track E2 & E3 — Background Cron Jobs (Reminder T+5, Alert T+15 & Auto-mark TIDAK_HADIR)

- **Fitur:** Scheduled cron service setiap menit untuk reminder check-in & auto-mark absensi.
- **Komponen:** `modules/attendance-cron/`.
- **Verifikasi:** 204/204 test PASS.
- **Keputusan:** Auto-mark `TIDAK_HADIR` dijalankan via conditional write reaktif tanpa Preemptive `findUnique`.

## [Stage 24] Track E1 — Endpoint API Notifikasi

- **Fitur:** Endpoint `GET /notifications` & `PATCH /notifications/:id/read`.
- **Komponen:** `modules/notifications/`.
- **Verifikasi:** 214/214 test PASS.
- **Keputusan:** Scoping murni via `req.user.userId` JWT payload (cegah IDOR); data hiding 404 pada resource bukan milik user.

## [Stage 25] Track F1 — GET /employees/available

- **Fitur:** Filter ketersediaan karyawan berdasar shift & izin.
- **Komponen:** `modules/employees/`.
- **Verifikasi:** 221/221 test PASS.

## [Stage 26] Track F2 — GET /employees/:id/schedules

- **Fitur:** Histori shift karyawan untuk HR_ADMIN.
- **Komponen:** `modules/employees/`.
- **Verifikasi:** 234/234 test PASS.

## [Stage 27] Track F3 — GET /schedules/today

- **Fitur:** Dashboard jadwal & status kehadiran hari ini untuk Karyawan.
- **Komponen:** `modules/schedules/`.
- **Verifikasi:** 42/42 test schedules PASS.
- **Keputusan:** Mendukung deteksi shift malam H-1 yang berakhir di hari ini.

## [Stage 28] Track F4 — GET /dashboard/attendance

- **Fitur:** Dashboard kehadiran site untuk Supervisor.
- **Komponen:** `modules/dashboard/`.
- **Verifikasi:** 14/14 test dashboard PASS.

## [Stage 29] Track F5 — GET /dashboard/unfilled-shifts

- **Fitur:** Monitoring shift terlambat >15 menit tanpa check-in.
- **Komponen:** `modules/dashboard/`, `common/constants/attendance.constant.ts`.
- **Verifikasi:** 258/258 test PASS.

## [Stage 30] Track F6 — GET /attendance/summary & GET /attendance/attempts

- **Fitur:** Agregasi ringkasan kehadiran & riwayat percobaan absensi untuk HR_ADMIN.
- **Komponen:** `modules/attendance/`, `common/utils/shift-status.util.ts`.
- **Verifikasi:** 291/291 test PASS.

## [Stage 31] Track F7 — GET /reports/export (PDF & XLSX)

- **Fitur:** Ekspor laporan ringkasan kehadiran dalam format PDF (`pdfkit`) dan Excel (`exceljs`).
- **Komponen:** `modules/attendance/reports.controller.ts`, `reports.service.ts`.
- **Verifikasi:** 300/300 test PASS.
- **Keputusan:** Bypass `ResponseInterceptor` dengan `@Res()` Express stream; reuse data summary `getAttendanceSummary`.

## [Stage 32] Track G1 — POST /employees/:id/reset-face-registration

- **Fitur:** Reset embedding wajah karyawan oleh HR_ADMIN.
- **Komponen:** `modules/employees/`.
- **Verifikasi:** 309/309 test PASS.

## [Stage 33] Track H — Mobile Foundation & Scaffold

- **Fitur:** Monorepo setup Expo Router, Zustand authStore (SecureStore JSON hydration), & Axios central client (`apiClient.ts`).
- **Komponen:** `apps/mobile/src/services/apiClient.ts`, `store/authStore.ts`, `types/api.ts`.
- **Verifikasi:** 17/17 test PASS, `tsc` clean.

## [Stage 34] Auth Mobile — NativeWind & Custom Fonts

- **Fitur:** Integrasi NativeWind v4, Tailwind CSS, & font lokal `Plus Jakarta Sans`.
- **Komponen:** `tailwind.config.js`, `apps/mobile/src/global.css`, `_layout.tsx`.
- **Verifikasi:** Build TypeScript PASS.

## [Stage 35] Auth Mobile — Wajib Ganti Password Screen

- **Fitur:** Screen `(auth)/change-password-required` & endpoint `POST /auth/change-password`.
- **Komponen:** `screens/auth/ChangePasswordRequiredScreen.tsx`, `components/KeyboardScreen.tsx`.
- **Verifikasi:** Mobile 25 tests PASS, Backend 316 tests PASS.

## [Stage 36] Auth Mobile — Lupa & Reset Password

- **Fitur:** Screen `(auth)/forgot-password` & `(auth)/reset-password`.
- **Komponen:** `screens/auth/ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx`.
- **Verifikasi:** 40 tests PASS.

## [Stage 37] Technical Debt — Bypass Sementara Verifikasi Wajah

- **Deskripsi:** Flag `SKIP_FACE_VERIFICATION=true` di backend untuk pengembangan mobile di mesin dev RAM 12GB.

## [Stage 38] Track I — Registrasi Wajah Mobile

- **Fitur:** Alur registrasi wajah karyawan (`FaceCameraScreen`, `FacePreviewScreen`, `FaceConfirmScreen`).
- **Komponen:** `screens/karyawan/Face*.tsx`, `app/(karyawan)/face-registration*`.
- **Verifikasi:** Unit test suite PASS.

## [Stage 39] Track I — Home Karyawan & Tab Navigation

- **Fitur:** Navigation `<Tabs>` 4 tab Karyawan, `BerandaScreen.tsx`, Quick Actions, & Reminder Banner.
- **Komponen:** `screens/karyawan/BerandaScreen.tsx`, `app/(karyawan)/_layout.tsx`.
- **Verifikasi:** Mobile 64 tests PASS.

## [Stage 40] Track E — In-Memory Mutex Cron Job Guard

- **Fitur:** Guard `isRunning` mutex flag pada `AttendanceCronService` untuk mencegah eksekusi cron overlap.
- **Komponen:** `modules/attendance-cron/attendance-cron.service.ts`.
- **Verifikasi:** 323/323 test PASS.

## [Stage 41] Track M1 — Redis Caching Dashboard & Reports

- **Fitur:** Integration `ioredis`, global fail-open `CacheService`, cache-aside dashboard (TTL 30s) & summary (TTL 300s), serta centralized invalidation.
- **Komponen:** `common/cache/`, `modules/dashboard/`, `modules/attendance/`.
- **Verifikasi:** 348/348 test PASS.

## [Stage 42] Track M2 — Redis Rate Limiting Auth

- **Fitur:** Rate limiter Redis (`POST /auth/login` 5x/60s, `POST /auth/forgot-password` 3x/300s) via `@nest-lab/throttler-storage-redis`.
- **Komponen:** `common/guards/fail-open-throttler.guard.ts`, `modules/auth/`.
- **Verifikasi:** 354/354 test PASS.

## [Stage 43] Track J1 — Attendance Mobile (Presensi Karyawan)

- **Fitur:** Presensi check-in/out karyawan (`AttendanceCameraScreen`, `AttendancePreviewScreen`, `AttendanceSuccessScreen`, `AbsensiScreen`).
- **Komponen:** `services/attendance.service.ts`, `screens/karyawan/Attendance*.tsx`, `screens/karyawan/AbsensiScreen.tsx`.
- **Verifikasi:** 89/89 tests PASS, `tsc` clean.
- **Keputusan:** Isolasi UI kamera absensi dari registrasi wajah; handle 3-cabang respons verifikasi.

## [Stage 44] Track J2 — Leave Requests Karyawan Mobile

- **Fitur:** Pengajuan & riwayat izin/cuti karyawan (`IzinScreen`, `LeaveRequestCreateScreen`) & 4 komponen UI reusable terpusat.
- **Komponen:** `services/leave-requests.service.ts`, `screens/karyawan/IzinScreen.tsx`, `LeaveRequestCreateScreen.tsx`, `components/` (`ScreenHeader`, `AsyncStateViews`, `AlertBanner`, `ConfirmModal`).
- **Verifikasi:** 129/129 tests PASS.
- **Keputusan:** Ekstraksi 4 komponen reusable UI terpusat; token warna semantik (`COLORS`); double-tap guard `useRef`.

## [Stage 45] Track J3 — Notifikasi Mobile Karyawan & Centralized Date Util

- **Fitur:** Riwayat & status baca notifikasi karyawan (`NotifikasiScreen.tsx`) serta utilitas tanggal terpusat (`date.util.ts`).
- **Komponen:** `services/notifications.service.ts`, `utils/date.util.ts`, `screens/karyawan/NotifikasiScreen.tsx`.
- **Verifikasi:** 148/148 tests PASS.
- **Keputusan:** Centralize konversi tanggal Asia/Jakarta (`+07:00`); optimistic update & revert handler pada status baca notifikasi.

## [Stage 46] Track K1 — Supervisor Dashboard Mobile

- **Fitur:** Monitoring kehadiran karyawan per site & alert shift belum terisi (`SupervisorHomeScreen.tsx`).
- **Komponen:** `services/dashboard.service.ts`, `screens/supervisor/SupervisorHomeScreen.tsx`, `app/(supervisor)/_layout.tsx`.
- **Verifikasi:** 157/157 tests PASS.

## [Stage 47] Track K2 — Supervisor Jadwal Mobile

- **Fitur:** CRUD jadwal shift karyawan (`SupervisorJadwalScreen`, `SupervisorJadwalFormScreen`).
- **Komponen:** `services/schedules.service.ts`, `supervisor-sites.service.ts`, `employees.service.ts`, `screens/supervisor/SupervisorJadwal*.tsx`.
- **Verifikasi:** 174/174 tests PASS.
- **Keputusan:** Single-site auto-skip; validasi shift 1-16 jam; presisi date parameter `getInitialSelectedDate` pada edit mode.

## [Stage 48] Track K3 — Supervisor Approval Izin Mobile

- **Fitur:** Persetujuan/penolakan izin karyawan oleh Supervisor & preview/download dokumen pendukung.
- **Komponen:** `services/leave-requests.service.ts`, `screens/supervisor/SupervisorIzinScreen.tsx`, `components/ConfirmModal.tsx`.
- **Verifikasi:** 187/187 tests PASS (31/31 test suites).
- **Keputusan:** Unduh dokumen via `FileSystem.downloadAsync` (`expo-file-system/legacy`) + `Sharing.shareAsync` (non-blocking error); badge jenis izin netral (`bg-slate-100`); confirm modal dengan input catatan supervisor opsional; positive empty state.

## [Stage 49] Track L1 & L2 — HR Admin Foundation & Employees Management Mobile

- **Fitur:** Scaffold tab navigator HR Admin, daftar karyawan (search & filter role/status), form create karyawan baru (reveal password sementara), dan form edit karyawan (role change modal & reset registrasi wajah).
- **Komponen:** `services/employees.service.ts`, `types/employee.ts`, `screens/hr-admin/` (`HrAdminEmployeesScreen.tsx`, `HrAdminEmployeeCreateScreen.tsx`, `HrAdminPasswordRevealScreen.tsx`, `HrAdminEmployeeEditScreen.tsx`), `app/(hr-admin)/`, `screens/hr-admin/__tests__/`.
- **Verifikasi:** 218/218 tests PASS (36/36 test suites, 100% full mobile suite).
- **Keputusan & Catatan Teknikal:**
  - Penyetaraan versi SDK `jest-expo` (`~54.0.17`) & `expo-document-picker` (`~13.0.3`) ke Expo SDK 54 untuk instalasi `expo-clipboard` (`~8.0.8`) tanpa `--legacy-peer-deps`.
  - Proteksi exit layar reveal password via `beforeRemove` listener + `pendingActionRef` (replay `e.data.action` saat konfirmasi, menggantikan `gestureEnabled` yang tidak didukung `Tabs`).
  - Shared lock `isAnyActionInFlightRef` pada form edit untuk men-disable seluruh tombol aksi secara bersamaan saat salah satu request sedang in-flight.
  - Type-safety zero `any` pada navigation event listener & dispatch menggunakan `NavigationAction` & `NavigationProp`.

## [Stage 50] Track L3 — HR Admin Sites Management Mobile & Backend Fix (Tahap 1–4 Final)

- **Fitur:** Manajemen lokasi kerja (sites) & alokasi supervisor HR Admin: CRUD sites/supervisor-sites, list site, form create/edit site dengan map picker (`react-native-maps`), assign/unassign supervisor, dan perbaikan backend `GET /supervisor-sites`.
- **Komponen:** `services/sites.service.ts`, `services/supervisor-sites.service.ts`, `types/site.ts`, `types/supervisor-site.ts`, `screens/hr-admin/` (`HrAdminSitesScreen.tsx`, `HrAdminSiteFormScreen.tsx`), `app/(hr-admin)/` (`site.tsx`, `site-create.tsx`, `site-edit.tsx`), `apps/backend/src/modules/supervisor-sites/` (`supervisor-sites.service.ts`, `supervisor-sites.controller.spec.ts`).
- **Verifikasi:** Mobile 257/257 tests PASS (39/39 suites) | Backend 183/183 tests PASS (14/14 suites).
- **Keputusan & Catatan Teknikal:**
  - **Fix Root Cause `GET /supervisor-sites`:** Penemuan dari kecurigaan tipe `supervisor` opsional di client; backend `findAll()` diperbaiki dengan menambahkan nested `supervisor: { select: { id, nama, email } }`. Tipe client disempurnakan menjadi required tanpa fallback.
  - **Map Picker Interaktif (`react-native-maps` `1.20.1`):** `MapView`, `Marker` (draggable), & `Circle` (radius meter) dengan sinkronisasi 2-arah (drag & input) dan fallback koordinat Jakarta (`-6.2088, 106.8456`) saat izin GPS ditolak.
  - **Standardisasi Token & Semantik:** Penyetaraan token `COLORS.primary` (`#FFC81E`) & semantik warna badge supervisor (`0` → `COLORS.warning`, `>0` → `COLORS.muted`).
  - **Assign/Unassign UX:** Modal picker supervisor dengan auto-filter `getAvailableSupervisors` & handling error `ROLE_BUKAN_SUPERVISOR` (400).

## [Stage 51] Track L4 — HR Admin Leave History Mobile

- **Fitur:** Layar read-only riwayat pengajuan izin seluruh karyawan untuk HR Admin (`HrAdminLeaveHistoryScreen.tsx`), ekstraksi shared badge config `getStatusIzinBadgeConfig`, service function `getLeaveRequestsHistory`, filter periode dengan native date picker (`@react-native-community/datetimepicker`), dan filter karyawan modal picker.
- **Komponen:** `utils/status-izin-badge.util.ts`, `services/leave-requests.service.ts`, `types/leave-request.ts`, `screens/hr-admin/HrAdminLeaveHistoryScreen.tsx`, `app/(hr-admin)/izin.tsx`, `screens/karyawan/IzinScreen.tsx`, `utils/__tests__/status-izin-badge.util.test.ts`, `screens/hr-admin/__tests__/HrAdminLeaveHistoryScreen.test.tsx`.
- **Verifikasi:** 269/269 tests PASS (41/41 test suites, 100% full mobile suite).
- **Keputusan & Catatan Teknikal:**
  - **Shared Badge Config Extraction:** Ekstraksi `getStatusIzinBadgeConfig` dari `IzinScreen.tsx` (Karyawan) ke `src/utils/status-izin-badge.util.ts` agar dapat di-reuse bersih oleh HR Admin (single source of truth).
  - **UX Date Filter Standardisation:** Menggunakan native `@react-native-community/datetimepicker` (default 30 hari terakhir) dengan tombol reset filter untuk mengosongkan periode (lihat histori lengkap tanpa batas).
  - **Document Viewer Reuse:** Re-use fungsi generic `downloadAndOpenDocument` untuk pratinjau/download dokumen pendukung (hanya ter-render jika `dokumenPendukungUrl !== null`).

