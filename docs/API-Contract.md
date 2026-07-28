# API Contract — Aplikasi Absensi Karyawan Outsourcing

> Bagian 3/3 Technical Design Document (setelah Arsitektur Sistem & ERD).
> Base path: `/api/v1`. Path pakai bahasa Inggris (konvensi REST universal), field JSON tetap Bahasa Indonesia (istilah domain bisnis).
> Auth: JWT Bearer token — kecuali `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, dan `/internal/*`.
> Dependency tambahan: **Resend** (transactional email, free tier 3.000 email/bulan) untuk flow reset password.

---

## Format Response Standar

**Sukses:**
```json
{ "success": true, "data": { "...": "..." }, "meta": { "timestamp": "ISO-8601", "requestId": "uuid" } }
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
  "meta": { "timestamp": "ISO-8601", "requestId": "uuid", "path": "/api/v1/attendance/check-in" }
}
```
`requestId` dipropagasi ke pemanggilan internal (NestJS → microservice Python) — memudahkan telusur log lintas service saat debugging.

---

## 1. Auth

### POST /auth/login
**Request:** `{ "email": "string", "password": "string" }`
**Response:** `{ "accessToken": "string", "role": "KARYAWAN | SUPERVISOR | HR_ADMIN", "userId": "uuid", "nama": "string", "wajahTerdaftar": boolean }`

`wajahTerdaftar` dipakai mobile app untuk redirect otomatis ke layar registrasi wajah kalau `false` — baik saat onboarding pertama kali, maupun setelah HR reset lewat `/employees/:id/reset-face-registration` (lihat §4).

Login **ditolak** (`error.code: "AKUN_NONAKTIF"`) kalau `User.statusAktif === false` — mencegah karyawan yang sudah resign/di-PHK tetap bisa check-in.

### POST /auth/change-password *(butuh login — beda dari forgot-password yang tanpa login)*
Ganti password saat user tahu password lama & sesi aktif — verifikasi pakai password lama, bukan email token. Ini fitur terpisah dari forgot-password: forgot-password untuk kasus lupa total (butuh verifikasi email), change-password untuk ganti rutin/higienitas keamanan (user tahu password lamanya).

**Request:** `{ "passwordLama": "string", "passwordBaru": "string" }`
**Response (sukses):** `{ "success": true }`
**Response (gagal):** `{ "success": false, "error": { "code": "PASSWORD_LAMA_SALAH" } }`

### POST /auth/forgot-password
Kirim email berisi link reset (lewat Resend).
**Request:** `{ "email": "string" }`
**Response:** `{ "success": true }` — selalu sukses meski email tidak terdaftar, untuk hindari user enumeration.

### POST /auth/reset-password
**Request:** `{ "token": "string", "passwordBaru": "string" }`
**Response:** `{ "success": true }`

### POST /users/me/face-registration *(role: KARYAWAN, sekali saat onboarding)*
**Request:** `multipart/form-data` → `foto: file`
**Alur internal:** panggil `POST /internal/embed` → simpan hasil embedding ke `User.faceEmbedding`
**Response:** `{ "success": true }`

---

## 2. Karyawan Lapangan

### GET /schedules/today
Jadwal shift & lokasi penugasan yang berlaku hari ini — *PP1*
```json
{
  "jadwalId": "uuid",
  "site": { "nama": "string", "alamat": "string", "latitude": 0, "longitude": 0, "radiusToleransi": 75 },
  "jamMulai": "datetime", "jamSelesai": "datetime",
  "statusKehadiran": "BELUM_CHECKIN | SUDAH_CHECKIN | SELESAI"
}
```

### GET /notifications
Notifikasi in-app: perubahan jadwal & reminder T+5 menit — *PP1, PP3*
```json
[{ "id": "uuid", "tipe": "PERUBAHAN_JADWAL | REMINDER_CHECKIN", "pesan": "string", "createdAt": "datetime", "dibaca": false }]
```

### PATCH /notifications/:id/read
Tandai notifikasi sudah dibaca (`dibaca: true`). Berlaku sama untuk Supervisor (§3) — endpoint yang sama, hasil di-scope ke `userId` masing-masing.
**Response:** `{ "success": true }`

### POST /leave-requests
Ajukan izin/sakit/cuti — *PP1*

**Request:** `multipart/form-data` → `tanggalMulai: date`, `tanggalSelesai: date`, `jenis: SAKIT | IZIN | CUTI`, `alasan: string`, `dokumen: file (opsional)`

**Validasi khusus:** kalau `jenis === SAKIT` dan durasi (`tanggalSelesai` − `tanggalMulai`) **> 1 hari** dan `dokumen` tidak disertakan → ditolak, `error.code: "DOKUMEN_WAJIB"`. Untuk `IZIN`/`CUTI`, dokumen selalu opsional (basisnya kepercayaan/kuota, bukan validasi medis).

**Response (sukses):** `{ "id": "uuid", "status": "PENDING" }`
**Response (gagal validasi):** `{ "success": false, "error": { "code": "DOKUMEN_WAJIB", "message": "Surat keterangan dokter wajib dilampirkan untuk sakit lebih dari 1 hari" } }`

### GET /leave-requests
Status pengajuan izin milik sendiri (histori + status terkini).

### PATCH /leave-requests/:id/cancel
Batalkan pengajuan sendiri — **hanya valid selama status masih `PENDING`** (kalau sudah `APPROVED`/`REJECTED`, gak bisa dibatalkan lewat sini, harus koordinasi manual ke supervisor).
**Response (sukses):** `{ "id": "uuid", "status": "CANCELLED" }`
**Response (gagal):** `{ "success": false, "error": { "code": "TIDAK_BISA_DIBATALKAN", "message": "Pengajuan sudah diproses, tidak bisa dibatalkan" } }`

### POST /attendance/check-in
Check-in dengan face verification + GPS — *PP2*

**Request:** `multipart/form-data` → `foto: file`, `latitude: number`, `longitude: number`, `jadwalId: uuid`

**Jendela waktu:** diterima dari **30 menit sebelum** `jamMulai` sampai `jamSelesai`. Di luar itu → ditolak (`hasilVerifikasi: DI_LUAR_JENDELA_WAKTU`), mencegah check-in jauh di luar waktu kerja wajar (mis. jam 2 pagi untuk shift jam 7 pagi).

**Alur internal (di NestJS):**
1. Cek jendela waktu — di luar rentang → tolak, `DI_LUAR_JENDELA_WAKTU`
2. Hitung Haversine(GPS dikirim, koordinat site) → di luar radius → `GAGAL_LOKASI`
3. Panggil `POST /internal/embed` dengan foto baru → dapat `embedding` + `liveness`
4. `liveness.isLive === false` → `GAGAL_LIVENESS`
5. Cosine similarity(embedding baru, `User.faceEmbedding`) di bawah threshold → `GAGAL_WAJAH`
6. Semua lolos → simpan/update `LogKehadiran` (`hasilVerifikasiCheckIn: VALID`)
7. **Setiap percobaan** (lolos maupun gagal) dicatat ke `PercobaanAbsensi` — audit trail lengkap

**Response (sukses):** `{ "logId": "uuid", "waktuCheckIn": "datetime", "hasilVerifikasi": "VALID" }`
**Response (gagal):** `{ "hasilVerifikasi": "GAGAL_LOKASI | GAGAL_WAJAH | GAGAL_LIVENESS | DI_LUAR_JENDELA_WAKTU", "pesan": "string" }`

### POST /attendance/check-out
Simetris dengan check-in — foto + GPS, alur verifikasi sama — *PP2*

**Request:** `multipart/form-data` → `foto: file`, `latitude: number`, `longitude: number`, `jadwalId: uuid`
**Jendela waktu:** dari waktu check-in tercatat, sampai `jamSelesai + 4 jam` (toleransi lembur wajar). Lewat itu → ditolak, arahkan hubungi supervisor untuk koreksi manual (data GPS/foto yang diambil jauh setelah shift berakhir sudah tidak reliable sebagai bukti).
**Response:** struktur sama dengan check-in, field `waktuCheckOut` & `hasilVerifikasiCheckOut`.

---

## 3. Supervisor / Koordinator Lapangan

### POST /schedules
Buat jadwal shift per karyawan per site — *PP1*
**Request:** `{ "karyawanId": "uuid", "siteId": "uuid", "tanggal": "date", "jamMulai": "time", "jamSelesai": "time" }`

### GET /schedules?siteId=&tanggal=
Jadwal untuk site yang diawasi supervisor ini (dibatasi lewat `SupervisorSite`).

### PATCH /schedules/:id · DELETE /schedules/:id
Koreksi/batalkan jadwal (salah input karyawan/jam, atau site berhenti kontrak mendadak).
**`DELETE` ditolak** (`error.code: "SUDAH_ADA_AKTIVITAS"`) kalau jadwal itu sudah punya `LogKehadiran` atau `PercobaanAbsensi` — data historis tidak boleh hilang begitu saja. Kalau perlu dibatalkan setelah ada aktivitas, gunakan `PATCH` untuk mengubah jam/site, bukan hapus.

### GET /leave-requests?status=PENDING
Daftar pengajuan izin yang perlu diapprove, dibatasi ke karyawan di site yang diawasi.

### PATCH /leave-requests/:id/approve · PATCH /leave-requests/:id/reject
**Request:** `{ "catatan": "string (opsional)" }`
**Response:** `{ "id": "uuid", "status": "APPROVED | REJECTED" }`

### GET /employees/available?tanggal=&siteId=
Karyawan yang belum punya jadwal di tanggal tsb — cari pengganti — *PP4*

### GET /dashboard/attendance?tanggal=
Status real-time seluruh site yang disupervisi — *PP2, PP3*
```json
[{ "karyawan": "string", "site": "string", "status": "HADIR | BELUM | TERLAMBAT | IZIN | TIDAK_HADIR", "waktuCheckIn": "datetime | null" }]
```
`TIDAK_HADIR` di-set otomatis oleh cron job (lihat §6) — bukan disimpulkan dari ketiadaan data.

### GET /dashboard/unfilled-shifts?tanggal=
Shift yang belum ter-cover (belum check-in melewati T+15 menit) — *PP4*

### GET /notifications
Alert otomatis T+15 menit — *PP3, PP4*

### GET /supervisor-sites?supervisorId=
Site yang diawasi (untuk ditampilkan di halaman profil) — lihat detail lengkap endpoint ini di §4, dikelola HR tapi dibaca juga dari sisi Supervisor.

---

## 4. HR / Admin

### POST /employees · GET /employees · PATCH /employees/:id
Kelola data master karyawan.

### POST /employees/:id/reset-face-registration
Kosongkan `faceEmbedding` karyawan (jadi array kosong) — dipakai kalau wajah karyawan berubah signifikan (kacamata, jenggot, dsb) dan verifikasi jadi sering gagal. Sengaja **tidak self-service** oleh karyawan — mencegah celah fraud identitas (kalau dibuka bebas, siapapun yang pegang device ter-login bisa daftar ulang wajah sendiri, menggantikan rujukan biometrik pemilik asli). Karyawan otomatis diarahkan ke layar registrasi wajah (reuse `/users/me/face-registration`) di login berikutnya, ditandai lewat `wajahTerdaftar: false` di response login.

**Response:** `{ "success": true }`

### POST /sites · GET /sites
Kelola master lokasi klien.

### PATCH /sites/:id · DELETE /sites/:id
Koreksi alamat/koordinat/radius toleransi, atau nonaktifkan site yang sudah tidak jadi klien.

### POST /supervisor-sites · GET /supervisor-sites?supervisorId= · DELETE /supervisor-sites/:id
Kelola mapping supervisor ↔ site yang diawasi (many-to-many). Sengaja jadi endpoint sendiri (bukan field tersembunyi di `/employees`), karena assignment bisa dipicu dari 2 arah — supervisor baru direkrut, ATAU site baru butuh ditempel ke supervisor yang sudah ada.

`GET` versi ini juga dipanggil dari sisi **Supervisor** (§3) untuk menampilkan "site yang saya awasi" di profil — hasilnya di-scope otomatis ke `supervisorId` milik sendiri.

**Request POST:** `{ "supervisorId": "uuid", "siteId": "uuid" }`
**Response POST:** `{ "id": "uuid" }`
**Response GET:** `[{ "id": "uuid", "site": { "id": "uuid", "nama": "string", "alamat": "string" } }]`
**Response DELETE:** `{ "success": true }`

### GET /attendance/summary?periodeMulai=&periodeSelesai=
Rekap kehadiran terkonsolidasi dari satu sumber data — *PP2*

### GET /attendance/attempts?karyawanId=&periodeMulai=&periodeSelesai=
**(Baru)** Audit trail setiap percobaan check-in/out (dari `PercobaanAbsensi`, termasuk yang gagal) — bukti konkret saat ada dispute dengan klien/karyawan, langsung menjawab pain point "HR tidak punya bukti konkret untuk verifikasi klaim" di as-is process.

### GET /reports/export?format=pdf|xlsx&periodeMulai=&periodeSelesai=
Generate laporan untuk payroll & pelaporan ke klien.

### GET /leave-requests/history?karyawanId=&periodeMulai=&periodeSelesai=
Audit trail approval izin — *PP1*

---

## 5. Internal API — NestJS ↔ Python Microservice

Tidak diekspos ke mobile app. Dipanggil server-to-server dari NestJS.

### POST /internal/embed
Satu-satunya endpoint microservice — stateless, tidak menyimpan apapun.

**Request:** `{ "foto": "base64 string" }`
**Response:** `{ "embedding": [0.123, "... (vector)"], "liveness": { "isLive": true, "confidence": 0.94 } }`

Dipanggil dari 3 tempat: `/users/me/face-registration`, `/attendance/check-in`, `/attendance/check-out`.

---

## 6. Auto-Mark Absent (Cron)

Cron job yang sama dengan alert T+15 menit diperluas: kalau sampai `jamSelesai`, `LogKehadiran.waktuCheckIn` masih kosong dan tidak ada satupun percobaan sukses — sistem membuat/mengupdate `LogKehadiran` dengan `hasilVerifikasiCheckIn: TIDAK_HADIR`. Status "tidak hadir" jadi tercatat eksplisit di data, bukan disimpulkan dari ketiadaan row — *PP3, PP4*.

---

## 7. Konvensi Umum

- **Status code:** 200, 201, 400, 401, 403, 404, 409 (konflik, misal check-in dobel untuk jadwal yang sama).
- **Tidak ada lagi reset password manual oleh HR** — digantikan self-service via `/auth/forgot-password` + `/auth/reset-password`.
- Semua endpoint (kecuali `/auth/*` dan `/internal/*`) wajib header `Authorization: Bearer <token>`, role diverifikasi lewat guard di NestJS.
