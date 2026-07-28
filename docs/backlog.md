# Backlog — Aplikasi Absensi Karyawan Outsourcing

> Urutan disusun berdasarkan **dependency graph**, bukan alur fitur — tiap item diurutkan
> dari siapa yang jadi prasyarat struktural buat item lain, bukan dari "cerita" fitur.
> Scope backlog ini sengaja dibatasi ke domain yang sudah didiskusikan & disepakati
> urutannya saja ("yang pasti-pasti"), bukan seluruh MVP dari PRD §7 — domain lain
> (leave-requests, dashboard, notifications, reports) akan ditambahkan belakangan
> saat direncanakan, bukan diisi sekarang biar gak basi kalau ada perubahan.

**Status legend:** `READY` (bisa mulai kapan saja) · `BLOCKED` (ada dependency yang belum siap) · `PENDING_DECISION` (nunggu keputusan Anda, referensi ke gap terkait)

---

## Track A — Site & Struktur Organisasi (sequential)

Kenapa jadi track prioritas #1: `Site`, `Employees`, `SupervisorSite`, `JadwalShift` adalah prasyarat FK
buat hampir semua endpoint lain di app ini (schedules butuh siteId+karyawanId valid, dashboard
butuh SupervisorSite terisi, check-in butuh JadwalShift ada). Urutan internal track ini sequential
karena tiap step butuh data dari step sebelumnya buat bisa ditest manual secara realistis.

| #   | Task                                                                                                  | Kenapa urutan segini                                                                                                             | Status                                               |
| --- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| A0  | Migration: tambah `Site.statusAktif` ke schema                                                        | Prasyarat `DELETE /sites/:id` — tanpa ini endpoint itu gak bisa diimplementasi sesuai kontrak ("nonaktifkan", bukan hard delete) | `READY`                                              |
| A1  | `POST /sites`, `GET /sites`, `PATCH /sites/:id`, `DELETE /sites/:id`                                  | Depend ke A0 (khusus DELETE). Gak depend ke apapun lain — bisa duluan                                                            | `READY` (setelah A0)                                 |
| A2  | `GET /employees`, `PATCH /employees/:id`                                                              | Gak butuh field password, jadi gak kena Gap 2. Independen dari A1 tapi digabung 1 domain (Employees) buat efisiensi konteks      | `READY`                                              |
| A3  | `POST /employees`                                                                                     | Field `password` masih belum jelas bentuknya (manual vs auto-generate+email)                                                     | `PENDING_DECISION` — nunggu Gap 2                    |
| A4  | `POST /supervisor-sites`, `GET /supervisor-sites`, `DELETE /supervisor-sites/:id`                     | Butuh existing user (supervisor) & site — testing manual bisa pakai 3 akun dummy dari `seed.ts`, gak harus nunggu A3 selesai     | `READY` (setelah A1 selesai, boleh mulai sebelum A3) |
| A5  | `POST /schedules`, `GET /schedules?siteId=&tanggal=`, `PATCH /schedules/:id`, `DELETE /schedules/:id` | Butuh Site (A1), karyawan (seed cukup, gak wajib A3), dan SupervisorSite (A4) buat scoping `GET /schedules` yang valid           | `READY` (setelah A1 & A4 selesai)                    |

---

## Track B — Auth Lanjutan (independen dari Track A)

| #   | Task                                                                         | Kenapa urutan                                                                                                                                                                                         | Status  |
| --- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| B1  | `POST /auth/forgot-password`, `POST /auth/reset-password` (integrasi Resend) | Dependency eksternal baru (API key Resend) — perlu di-flag ke Antigravity kalau mau nambah package. Gak ada endpoint lain yang depend ke ini, jadi fleksibel dikerjakan kapan saja relatif ke Track A | `READY` |

---

## Track C — Face Service (paralel, independen penuh)

Kenapa boleh paralel: microservice ini stateless, satu-satunya endpoint-nya (`/internal/embed`)
gak nyentuh Postgres/JadwalShift/Site sama sekali — beda dari endpoint NestJS yang _manggil_ dia.

| #   | Task                                                                        | Kenapa urutan segini                                                                                   | Status                     |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------- |
| C1  | Python microservice: `POST /internal/embed` (DeepFace embedding + liveness) | Gak depend ke apapun di Track A/B — boleh dikerjakan kapan saja, termasuk bersamaan dengan Track A     | `READY`                    |
| C2  | `POST /users/me/face-registration` (NestJS, manggil `/internal/embed`)      | Butuh C1 jadi dulu, kalau enggak endpoint ini selalu gagal saat ditest                                 | `BLOCKED` — nunggu C1      |
| C3  | `POST /attendance/check-in`, `POST /attendance/check-out`                   | Butuh C1 (face verification) **dan** A5 (JadwalShift buat `jadwalId` valid) — dua dependency sekaligus | `BLOCKED` — nunggu C1 & A5 |

---

## Gap tertunda (belum masuk task konkret manapun di atas)

- **Gap 3** — endpoint "riwayat penempatan site" (PRD 5.3) belum ada representasi di API Contract. Belum di-assign ke task manapun sampai diputuskan: endpoint baru, atau reuse endpoint existing.
- Domain leave-requests, dashboard/unfilled-shifts, notifications (cron), reports — belum dibahas sama sekali, sengaja belum masuk backlog.
