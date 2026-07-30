# API Contract — Aplikasi Absensi Karyawan Outsourcing

> Base path: `/api/v1`. Path menggunakan bahasa Inggris, field JSON tetap Bahasa Indonesia.
> Auth: JWT Bearer token — kecuali yang dinyatakan sebaliknya.

## Format Response Standar

**Sukses:**
```json
{
  "success": true,
  "data": { "...": "..." },
  "meta": { "timestamp": "ISO-8601", "requestId": "uuid" }
}
```

**Gagal:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | GAGAL_LOKASI | UNAUTHORIZED | ...",
    "message": "pesan manusia-terbaca",
    "details": [{ "field": "latitude", "issue": "wajib diisi" }]
  },
  "meta": { "timestamp": "ISO-8601", "requestId": "uuid", "path": "/api/v1/..." }
}
```

---

## 1. Auth & Profil

### `POST /auth/login`
- **Role:** Publik (Tanpa Token)
- **Request:** `{ "email": "string", "password": "string" }`
- **Response:** `{ "accessToken": "string", "role": "KARYAWAN | SUPERVISOR | HR_ADMIN", "userId": "uuid", "nama": "string", "wajahTerdaftar": boolean, "wajibGantiPassword": boolean }`
- **Error Codes:** `AKUN_NONAKTIF`

### `POST /auth/change-password`
- **Role:** Semua (KARYAWAN, SUPERVISOR, HR_ADMIN)
- **Request:** `{ "passwordLama": "string", "passwordBaru": "string" }`
- **Response:** `{ "success": true }`
- **Error Codes:** `PASSWORD_LAMA_SALAH`

### `POST /auth/forgot-password`
- **Role:** Publik (Tanpa Token)
- **Request:** `{ "email": "string" }`
- **Response:** `{ "success": true }`

### `POST /auth/reset-password`
- **Role:** Publik (Tanpa Token)
- **Request:** `{ "email": "string", "token": "string (6 digit)", "passwordBaru": "string" }`
- **Response:** `{ "success": true }`
- **Error Codes:** `TOKEN_TIDAK_VALID`

### `POST /users/me/face-registration`
- **Role:** KARYAWAN
- **Request:** `multipart/form-data` → `foto: file`
- **Response:** `{ "success": true }`

---

## 2. Karyawan (Employees)

### `POST /employees`
- **Role:** HR_ADMIN
- **Request:** `{ "nama": "string", "email": "string", "role": "KARYAWAN | SUPERVISOR | HR_ADMIN" }`
- **Response:** `{ "id": "uuid", "nama": "string", "email": "string", "role": "string", "statusAktif": true, "passwordSementara": "string", "createdAt": "datetime" }`

### `GET /employees`
- **Role:** HR_ADMIN
- **Query Params:** `role` (opsional), `statusAktif` (opsional), `search` (opsional)
- **Response:** `[{ "id": "uuid", "nama": "string", "email": "string", "role": "string", "statusAktif": boolean, "wajahTerdaftar": boolean }]`

### `PATCH /employees/:id`
- **Role:** HR_ADMIN
- **Request:** `{ "nama": "string?", "email": "string?", "role": "string?", "statusAktif": "boolean?" }`
- **Response:** Sama seperti response `GET /employees`

### `POST /employees/:id/reset-face-registration`
- **Role:** HR_ADMIN
- **Response:** `{ "success": true }`

### `GET /employees/available`
- **Role:** SUPERVISOR, HR_ADMIN
- **Query Params:** `tanggal` (wajib), `siteId` (wajib)
- **Response:** `[{ "id": "uuid", "nama": "string" }]`

---

## 3. Site & Supervisor Sites

### `POST /sites`
- **Role:** HR_ADMIN
- **Request:** `{ "nama": "string", "alamat": "string", "latitude": number, "longitude": number, "radiusToleransi": "number (opsional, default 75)" }`
- **Response:** `{ "id": "uuid", "nama": "string", "alamat": "string", "latitude": number, "longitude": number, "radiusToleransi": number, "statusAktif": true }`

### `GET /sites`
- **Role:** HR_ADMIN
- **Query Params:** `statusAktif` (opsional)
- **Response:** `[{ "id": "uuid", "nama": "string", "alamat": "string", "latitude": number, "longitude": number, "radiusToleransi": number, "statusAktif": boolean }]`

### `PATCH /sites/:id`
- **Role:** HR_ADMIN
- **Request:** `{ "nama": "string?", "alamat": "string?", "latitude": "number?", "longitude": "number?", "radiusToleransi": "number?", "statusAktif": "boolean?" }`
- **Response:** Sama seperti response `POST /sites`

### `POST /supervisor-sites`
- **Role:** HR_ADMIN
- **Request:** `{ "supervisorId": "uuid", "siteId": "uuid" }`
- **Response:** `{ "id": "uuid" }`

### `GET /supervisor-sites`
- **Role:** SUPERVISOR, HR_ADMIN
- **Query Params:** `supervisorId` (opsional untuk HR, wajib untuk di-scope ke dirinya bagi SUPERVISOR)
- **Response:** `[{ "id": "uuid", "site": { "id": "uuid", "nama": "string", "alamat": "string" } }]`

### `DELETE /supervisor-sites/:id`
- **Role:** HR_ADMIN
- **Response:** `{ "success": true }`

---

## 4. Jadwal (Schedules)

### `POST /schedules`
- **Role:** SUPERVISOR
- **Request:** `{ "karyawanId": "uuid", "siteId": "uuid", "tanggal": "date", "jamMulai": "time", "jamSelesai": "time" }`
- **Error Codes:** `DURASI_SHIFT_TIDAK_VALID` (durasi harus 1-16 jam)

### `GET /schedules`
- **Role:** SUPERVISOR
- **Query Params:** `siteId` (opsional), `tanggal` (opsional)
- **Response:** Daftar jadwal di-scope ke site yang dikelola supervisor.

### `PATCH /schedules/:id`
- **Role:** SUPERVISOR
- **Request:** Field yang sama dengan POST (opsional)
- **Error Codes:** `DURASI_SHIFT_TIDAK_VALID`

### `DELETE /schedules/:id`
- **Role:** SUPERVISOR
- **Response:** `{ "success": true }`
- **Error Codes:** `SUDAH_ADA_AKTIVITAS` (ditolak jika sudah ada log/percobaan)

### `GET /schedules/today`
- **Role:** KARYAWAN
- **Response:**
```json
[{
  "jadwalId": "uuid",
  "site": { "nama": "string", "alamat": "string", "latitude": 0, "longitude": 0, "radiusToleransi": 75 },
  "jamMulai": "datetime",
  "jamSelesai": "datetime",
  "statusKehadiran": "BELUM_CHECKIN | SUDAH_CHECKIN | SELESAI"
}]
```

### `GET /employees/:id/schedules`
- **Role:** HR_ADMIN
- **Query Params:** `tanggalMulai`, `tanggalSelesai`
- **Response:** Daftar jadwal untuk satu karyawan.

---

## 5. Kehadiran (Attendance)

### `POST /attendance/check-in`
- **Role:** KARYAWAN
- **Request:** `multipart/form-data` → `foto: file`, `latitude: number`, `longitude: number`, `jadwalId: uuid`
- **Response (sukses):** `{ "logId": "uuid", "waktuCheckIn": "datetime", "hasilVerifikasi": "VALID" }`
- **Response (gagal):** `{ "hasilVerifikasi": "GAGAL_LOKASI | GAGAL_WAJAH | GAGAL_LIVENESS | DI_LUAR_JENDELA_WAKTU", "pesan": "string" }`

### `POST /attendance/check-out`
- **Role:** KARYAWAN
- **Request:** `multipart/form-data` → Sama seperti check-in.
- **Response:** Sama seperti check-in, ditambah field `waktuCheckOut` & `hasilVerifikasiCheckOut`.

### `GET /dashboard/attendance`
- **Role:** SUPERVISOR
- **Query Params:** `tanggal`
- **Response:** `[{ "karyawan": "string", "site": "string", "status": "HADIR | BELUM | TERLAMBAT | IZIN | TIDAK_HADIR", "waktuCheckIn": "datetime | null" }]`

### `GET /dashboard/unfilled-shifts`
- **Role:** SUPERVISOR
- **Query Params:** `tanggal`
- **Response:** Daftar shift kosong yang melewati T+15.

### `GET /attendance/summary`
- **Role:** HR_ADMIN
- **Query Params:** `periodeMulai`, `periodeSelesai`

### `GET /attendance/attempts`
- **Role:** HR_ADMIN
- **Query Params:** `karyawanId`, `periodeMulai`, `periodeSelesai`

---

## 6. Pengajuan Izin (Leave Requests)

### `POST /leave-requests`
- **Role:** KARYAWAN
- **Request:** `multipart/form-data` → `tanggalMulai: date`, `tanggalSelesai: date`, `jenis: SAKIT | IZIN | CUTI`, `alasan: string`, `dokumen: file (opsional)`
- **Response:** `{ "id": "uuid", "status": "PENDING" }`
- **Error Codes:** `DOKUMEN_WAJIB` (jika sakit > 1 hari kalender), `IZIN_BENTROK`

### `GET /leave-requests`
- **Role:** KARYAWAN, SUPERVISOR, HR_ADMIN
- **Query Params:** `status` (Khusus SUPERVISOR/HR_ADMIN wajib diisi `PENDING`)
- **Response:** Daftar pengajuan izin (Supervisor di-scope ke sitenya, HR_ADMIN ke data _orphaned_).

### `PATCH /leave-requests/:id/cancel`
- **Role:** KARYAWAN
- **Response:** `{ "id": "uuid", "status": "CANCELLED" }`
- **Error Codes:** `TIDAK_BISA_DIBATALKAN` (jika bukan PENDING)

### `PATCH /leave-requests/:id/approve` & `PATCH /leave-requests/:id/reject`
- **Role:** SUPERVISOR, HR_ADMIN
- **Request:** `{ "catatanSupervisor": "string?" }`
- **Response:** `{ "id": "uuid", "status": "APPROVED | REJECTED" }`
- **Error Codes:** `BUKAN_FALLBACK_HR` (khusus HR), `IZIN_SUDAH_DIPROSES` (409)

### `GET /leave-requests/history`
- **Role:** HR_ADMIN
- **Query Params:** `karyawanId`, `periodeMulai`, `periodeSelesai`
- **Response:** Daftar penuh pengajuan izin.

---

## 7. Notifikasi (Notifications)

### `GET /notifications`
- **Role:** KARYAWAN, SUPERVISOR
- **Response:** `[{ "id": "uuid", "tipe": "PERUBAHAN_JADWAL | REMINDER_CHECKIN", "pesan": "string", "createdAt": "datetime", "dibaca": boolean }]`

### `PATCH /notifications/:id/read`
- **Role:** KARYAWAN, SUPERVISOR
- **Response:** `{ "success": true }`

---

## 8. Laporan & Ekspor (Reports)

### `GET /reports/export`
- **Role:** HR_ADMIN
- **Query Params:** `format=pdf|xlsx`, `periodeMulai`, `periodeSelesai`

---

## 9. Internal Microservice (Python)

### `POST /internal/embed`
- **Akses:** Bebas token (hanya dari Backend NestJS internal jaringan)
- **Request:** `{ "foto": "base64 string" }`
- **Response:** `{ "embedding": [0.123, ...], "liveness": { "isLive": true, "confidence": 0.94 } }`
