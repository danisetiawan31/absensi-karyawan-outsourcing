# API Contract — Aplikasi Absensi Karyawan Outsourcing

> Bagian 3/3 Technical Design Document (setelah Arsitektur Sistem & ERD).
> Base path: `/api/v1`. Path pakai bahasa Inggris (konvensi REST universal), field JSON tetap Bahasa Indonesia (istilah domain bisnis).
> Auth: JWT Bearer token — kecuali `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, dan `/internal/*`.
> Dependency tambahan: **Resend** (transactional email, free tier 3.000 email/bulan) untuk flow reset password self-service.

---

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
  "meta": {
    "timestamp": "ISO-8601",
    "requestId": "uuid",
    "path": "/api/v1/attendance/check-in"
  }
}
```

`requestId` dipropagasi ke pemanggilan internal (NestJS → microservice Python) — memudahkan telusur log lintas service saat debugging.

---

## 1. Auth

### POST /auth/login

**Request:** `{ "email": "string", "password": "string" }`
**Response:** `{ "accessToken": "string", "role": "KARYAWAN | SUPERVISOR | HR_ADMIN", "userId": "uuid", "nama": "string", "wajahTerdaftar": boolean, "wajibGantiPassword": boolean }`

`wajahTerdaftar` dipakai mobile app untuk redirect otomatis ke layar registrasi wajah kalau `false` — baik saat onboarding pertama kali, maupun setelah HR reset lewat `/employees/:id/reset-face-registration` (lihat §4).

`wajibGantiPassword` dipakai mobile app untuk redirect paksa ke layar ganti password kalau `true` — kondisi ini muncul saat HR baru membuat akun karyawan (lihat `POST /employees` di §4): password awal dibuat sistem secara acak dan cuma ditampilkan sekali ke HR, sehingga karyawan wajib menggantinya sebelum bisa mengakses fitur lain. Field ini berasal dari kolom `User.wajibGantiPassword` di database (bukan derived, beda dengan `wajahTerdaftar` yang dihitung dari `faceEmbedding.length`), karena hash password tidak menyimpan informasi apakah password itu sementara atau bukan.

Login **ditolak** (`error.code: "AKUN_NONAKTIF"`) kalau `User.statusAktif === false` — mencegah karyawan yang sudah resign/di-PHK tetap bisa check-in.

### POST /auth/change-password _(butuh login — beda dari forgot-password yang tanpa login)_

Ganti password saat user tahu password lama & sesi aktif — verifikasi pakai password lama, bukan email token. Ini fitur terpisah dari forgot-password: forgot-password untuk kasus lupa total (butuh verifikasi email), change-password untuk ganti rutin/higienitas keamanan (user tahu password lamanya) **maupun untuk melunasi kewajiban ganti password awal** (lihat `wajibGantiPassword` di atas).

**Request:** `{ "passwordLama": "string", "passwordBaru": "string" }`
**Response (sukses):** `{ "success": true }`
**Response (gagal):** `{ "success": false, "error": { "code": "PASSWORD_LAMA_SALAH" } }`

**Efek samping wajib saat sukses:** kalau `User.wajibGantiPassword` sebelumnya `true`, endpoint ini WAJIB men-set-nya jadi `false` sebagai bagian dari transaksi yang sama. Tanpa ini, karyawan akan terus dipaksa redirect ganti password di setiap login berikutnya meski sudah pernah ganti — jadi ini bukan detail implementasi bebas, harus eksplisit di service layer.

### POST /auth/forgot-password

Kirim email berisi link reset (lewat Resend).
**Request:** `{ "email": "string" }`
**Response:** `{ "success": true }` — selalu sukses meski email tidak terdaftar, untuk hindari user enumeration.

### POST /auth/reset-password

**Request:** `{ "email": "string", "token": "string (6 digit)", "passwordBaru": "string" }`
**Response (sukses):** `{ "success": true }`
**Response (gagal):** `{ "success": false, "error": { "code": "TOKEN_TIDAK_VALID" } }`

> **Catatan:**
>
> - Field `email` ditambahkan karena `token` (6 digit angka acak) bukan _identifier_ unik. `email` dibutuhkan untuk mengidentifikasi pengguna sebelum memvalidasi token (menghindari risiko kolisi).
> - `resetToken` dan `resetTokenExpiry` akan di-set menjadi `null` setelah berhasil, memastikan satu token hanya bisa digunakan sekali.
> - Efek samping sukses: `User.wajibGantiPassword` juga akan di-set menjadi `false` (sama seperti `/auth/change-password`).

### POST /users/me/face-registration _(role: KARYAWAN, sekali saat onboarding)_

**Request:** `multipart/form-data` → `foto: file`
**Alur internal:** panggil `POST /internal/embed` → simpan hasil embedding ke `User.faceEmbedding`
**Response:** `{ "success": true }`

---

## 2. Karyawan Lapangan

### GET /schedules/today

Jadwal shift & lokasi penugasan yang berlaku hari ini — _PP1_

```json
{
  "jadwalId": "uuid",
  "site": {
    "nama": "string",
    "alamat": "string",
    "latitude": 0,
    "longitude": 0,
    "radiusToleransi": 75
  },
  "jamMulai": "datetime",
  "jamSelesai": "datetime",
  "statusKehadiran": "BELUM_CHECKIN | SUDAH_CHECKIN | SELESAI"
}
```

### GET /notifications

Notifikasi in-app: perubahan jadwal & reminder T+5 menit — _PP1, PP3_

```json
[
  {
    "id": "uuid",
    "tipe": "PERUBAHAN_JADWAL | REMINDER_CHECKIN",
    "pesan": "string",
    "createdAt": "datetime",
    "dibaca": false
  }
]
```

### PATCH /notifications/:id/read

Tandai notifikasi sudah dibaca (`dibaca: true`). Berlaku sama untuk Supervisor (§3) — endpoint yang sama, hasil di-scope ke `userId` masing-masing.
**Response:** `{ "success": true }`

### POST /leave-requests

Ajukan izin/sakit/cuti — _PP1_

**Request:** `multipart/form-data` → `tanggalMulai: date`, `tanggalSelesai: date`, `jenis: SAKIT | IZIN | CUTI`, `alasan: string`, `dokumen: file (opsional)`

**Validasi khusus:** kalau `jenis === SAKIT` dan `tanggalSelesai` berbeda dari `tanggalMulai` (durasi sakit mencakup lebih dari 1 hari kalender — mis. Senin **dan** Selasa, bukan cuma Senin saja) dan `dokumen` tidak disertakan → ditolak, `error.code: "DOKUMEN_WAJIB"`. Untuk `IZIN`/`CUTI`, dokumen selalu opsional (basisnya kepercayaan/kuota, bukan validasi medis).

_(Klarifikasi: formula sebelumnya — "durasi > 1 hari" dibaca sebagai selisih matematis `tanggalSelesai − tanggalMulai` — ambigu dan berpotensi meloloskan sakit 2 hari kalender tanpa dokumen. Sudah diperjelas mengikuti praktik HR standar: sakit lebih dari 1 hari kalender (2 hari kalender ke atas) selalu wajib dokumen.)_

**Validasi overlap (tumpang tindih):** Karyawan tidak boleh mengajukan izin baru yang rentang tanggalnya tumpang tindih dengan pengajuan izin miliknya yang bersatus `PENDING` atau `APPROVED` (apapun `jenis` izinnya — karena secara logis tidak mungkin CUTI bersamaan dengan SAKIT). Jika tumpang tindih → ditolak, `error.code: "IZIN_BENTROK"`.

**Response (sukses):** `{ "id": "uuid", "status": "PENDING" }`
**Response (gagal validasi):** `{ "success": false, "error": { "code": "DOKUMEN_WAJIB", "message": "Surat keterangan dokter wajib dilampirkan untuk sakit lebih dari 1 hari" } }`
**Response (gagal bentrok):** `{ "success": false, "error": { "code": "IZIN_BENTROK", "message": "Anda sudah punya pengajuan izin lain yang tumpang tindih di rentang tanggal ini" } }`

### GET /leave-requests

Status pengajuan izin milik sendiri (histori + status terkini).

### PATCH /leave-requests/:id/cancel

Batalkan pengajuan sendiri — **hanya valid selama status masih `PENDING`** (kalau sudah `APPROVED`/`REJECTED`, gak bisa dibatalkan lewat sini, harus koordinasi manual ke supervisor).
**Response (sukses):** `{ "id": "uuid", "status": "CANCELLED" }`
**Response (gagal):** `{ "success": false, "error": { "code": "TIDAK_BISA_DIBATALKAN", "message": "Pengajuan sudah diproses, tidak bisa dibatalkan" } }`

### POST /attendance/check-in

Check-in dengan face verification + GPS — _PP2_

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

Simetris dengan check-in — foto + GPS, alur verifikasi sama — _PP2_

**Request:** `multipart/form-data` → `foto: file`, `latitude: number`, `longitude: number`, `jadwalId: uuid`
**Jendela waktu:** dari waktu check-in tercatat, sampai `jamSelesai + 4 jam` (toleransi lembur wajar). Lewat itu → ditolak, arahkan hubungi supervisor untuk koreksi manual (data GPS/foto yang diambil jauh setelah shift berakhir sudah tidak reliable sebagai bukti).
**Response:** struktur sama dengan check-in, field `waktuCheckOut` & `hasilVerifikasiCheckOut`.

---

## 3. Supervisor / Koordinator Lapangan

### POST /schedules

Buat jadwal shift per karyawan per site — _PP1_
**Request:** `{ "karyawanId": "uuid", "siteId": "uuid", "tanggal": "date", "jamMulai": "time", "jamSelesai": "time" }`

**Catatan implementasi:** `jamMulai`/`jamSelesai` di request bertipe `time`, tapi `JadwalShift.jamMulai`/`jamSelesai` di schema bertipe `DateTime` penuh — service layer wajib menggabungkan `tanggal` + `jamMulai`/`jamSelesai` menjadi satu `DateTime` lengkap sebelum disimpan. Ini konversi mekanis, bukan ambiguitas requirement.

**Validasi durasi shift:** durasi (`jamSelesai` − `jamMulai`, dihitung setelah penyesuaian shift yang melewati tengah malam) harus **lebih dari 0** dan **tidak boleh melebihi 16 jam** — di luar rentang itu ditolak, `error.code: "DURASI_SHIFT_TIDAK_VALID"`. Batas bawah (>0) mencegah `jamMulai` yang persis sama dengan `jamSelesai` lolos sebagai shift berdurasi nol; batas atas (16 jam) mencegah kesalahan input jam yang tertukar menghasilkan shift dengan durasi tidak wajar tanpa peringatan ke supervisor.

### GET /schedules?siteId=&tanggal=

Jadwal untuk site yang diawasi supervisor ini (dibatasi lewat `SupervisorSite`).

### PATCH /schedules/:id · DELETE /schedules/:id

Koreksi/batalkan jadwal (salah input karyawan/jam, atau site berhenti kontrak mendadak).
**`DELETE` ditolak** (`error.code: "SUDAH_ADA_AKTIVITAS"`) kalau jadwal itu sudah punya `LogKehadiran` atau `PercobaanAbsensi` — data historis tidak boleh hilang begitu saja. Kalau perlu dibatalkan setelah ada aktivitas, gunakan `PATCH` untuk mengubah jam/site, bukan hapus.

**Validasi durasi shift** (lihat `POST /schedules` di atas, batas 0–16 jam) berlaku juga di `PATCH` — kalau kombinasi akhir `jamMulai`/`jamSelesai` (baik yang diubah lewat request maupun yang tetap dari data existing) berada di luar rentang itu, ditolak dengan `error.code: "DURASI_SHIFT_TIDAK_VALID"` yang sama.

### GET /leave-requests?status=PENDING

Daftar pengajuan izin yang perlu diapprove, dibatasi ke karyawan di site yang diawasi pada rentang tanggal tersebut.
**Role:** SUPERVISOR, HR_ADMIN (Dual-role)

- **SUPERVISOR**: Hanya melihat pengajuan dari karyawan di site yang diawasi (scoping normal).
- **HR_ADMIN**: Hanya melihat pengajuan yang **orphaned** (tidak ter-cover supervisor manapun). Bukan akses penuh ke semua pengajuan.

**Validasi:** Wajib menyertakan parameter `status=PENDING` (hanya bisa melihat yang belum diproses). Jika tidak ada atau status selain PENDING, ditolak `400 Bad Request`, `error.code: "STATUS_WAJIB_PENDING"`.
**Response:** Sama seperti response Karyawan, ditambah objek `karyawan: { id: "uuid", nama: "string" }` agar supervisor/HR tahu ini pengajuan milik siapa.

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tanggalMulai": "date",
      "tanggalSelesai": "date",
      "jenis": "SAKIT | IZIN | CUTI",
      "alasan": "string",
      "dokumenPendukungUrl": "string | null",
      "status": "PENDING",
      "catatanSupervisor": "string | null",
      "createdAt": "datetime",
      "karyawan": {
        "id": "uuid",
        "nama": "string"
      }
    }
  ],
  "meta": { ... }
}
```

### PATCH /leave-requests/:id/approve · PATCH /leave-requests/:id/reject

Endpoint untuk menyetujui atau menolak pengajuan izin oleh Supervisor atau HR Admin.

**Role:** SUPERVISOR, HR_ADMIN (Dual-role)

- **SUPERVISOR**: Hanya dapat memproses jika pengajuan berada di dalam scope (karyawan memiliki jadwal shift di site yang diawasi supervisor ini pada rentang tanggal izin).
- **HR_ADMIN**: Hanya dapat memproses jika pengajuan bersifat **orphaned** (tidak ter-cover supervisor manapun). Jika pengajuan ternyata masih dalam cakupan supervisor, sistem akan menolak dengan `403 Forbidden` (`BUKAN_FALLBACK_HR`).

**Penting:** Karena karyawan bisa memiliki jadwal di lintas site, 1 pengajuan bisa dilihat oleh beberapa supervisor. Supervisor/HR yang memproses pertama akan mengubah status, dan percobaan proses oleh aktor lain akan mengembalikan 409 (siapa cepat dia dapat).

**Request Body:**

```json
{
  "catatanSupervisor": "string (opsional, maks 255 karakter)"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "APPROVED | REJECTED"
  },
  "meta": { ... }
}
```

**Error Responses:**

- `404 Not Found`: Jika ID pengajuan tidak ditemukan, ATAU pengajuan tersebut berada di luar scope site yang diawasi supervisor ini (pesan error sama persis untuk menjaga privasi data).
- `403 Forbidden` (code: `BUKAN_FALLBACK_HR`): Khusus caller `HR_ADMIN` — pengajuan ditemukan dan masih dalam cakupan supervisor sah, bukan kasus fallback.
- `409 Conflict` (code: `IZIN_SUDAH_DIPROSES`): Jika pengajuan ditemukan dan berada di dalam scope, tetapi statusnya BUKAN PENDING (misal: sudah disetujui/ditolak oleh supervisor lain, atau dibatalkan karyawan).

### GET /employees/available?tanggal=&siteId=

Karyawan yang belum punya jadwal di tanggal tsb — cari pengganti — _PP4_

### GET /dashboard/attendance?tanggal=

Status real-time seluruh site yang disupervisi — _PP2, PP3_

```json
[
  {
    "karyawan": "string",
    "site": "string",
    "status": "HADIR | BELUM | TERLAMBAT | IZIN | TIDAK_HADIR",
    "waktuCheckIn": "datetime | null"
  }
]
```

`TIDAK_HADIR` di-set otomatis oleh cron job (lihat §6) — bukan disimpulkan dari ketiadaan data.

### GET /dashboard/unfilled-shifts?tanggal=

Shift yang belum ter-cover (belum check-in melewati T+15 menit) — _PP4_

### GET /notifications

Alert otomatis T+15 menit — _PP3, PP4_

### GET /supervisor-sites?supervisorId=

Site yang diawasi (untuk ditampilkan di halaman profil) — lihat detail lengkap endpoint ini di §4, dikelola HR tapi dibaca juga dari sisi Supervisor.

---

## 4. HR / Admin

### POST /employees

Buat akun karyawan baru — satu-satunya jalur pembuatan user di sistem ini (tidak ada self-register, lihat §1).

**Request:** `{ "nama": "string", "email": "string", "role": "KARYAWAN | SUPERVISOR | HR_ADMIN" }`

Tidak ada field `password` di request — sistem yang membuatnya secara otomatis (lihat di bawah).

**Response:** `{ "id": "uuid", "nama": "string", "email": "string", "role": "string", "statusAktif": true, "passwordSementara": "string", "createdAt": "datetime" }`

**Alur password:** sistem generate password acak (bukan HR yang menentukan), disimpan sebagai hash seperti biasa, DAN dikembalikan **satu kali saja** di field `passwordSementara` pada response ini — tidak pernah bisa diambil ulang setelahnya (tidak disimpan plaintext di DB). HR menyalin nilai ini dan menyampaikannya secara manual ke karyawan (WA/lisan — sesuai cara kerja HR di industri lapangan ini). `User.wajibGantiPassword` otomatis `true` untuk akun baru, memaksa karyawan mengganti password di login pertama lewat `POST /auth/change-password` (lihat §1).

Pendekatan ini dipilih dibanding kirim password lewat email (Resend) karena karyawan lapangan (satpam/cleaning service) tidak selalu reliable dicapai lewat email — menghindari failure mode akun "orphan" kalau email gagal terkirim/masuk spam, tanpa mekanisme "resend invite".

### GET /employees?role=&statusAktif=&search=

List karyawan, filter opsional. Default (tanpa `statusAktif`) menampilkan semua — konsisten dengan pola `GET /sites`, supaya histori karyawan resign/nonaktif tetap bisa ditelusuri HR, bukan cuma yang aktif.

**Response:** `[{ "id": "uuid", "nama": "string", "email": "string", "role": "string", "statusAktif": boolean, "wajahTerdaftar": boolean }]`

(`wajahTerdaftar` cuma relevan untuk role `KARYAWAN`, ikut pola field yang sama di `POST /auth/login`.)

### PATCH /employees/:id

Update data karyawan — termasuk nonaktifkan (`statusAktif: false`) saat resign/PHK.

**Request:** `{ "nama": "string (opsional)", "email": "string (opsional)", "role": "string (opsional)", "statusAktif": "boolean (opsional)" }`
**Response:** object employee terbaru (struktur sama dengan `GET`, tanpa `passwordSementara`)

Field `password` **tidak** bisa diubah lewat endpoint ini — ganti password lewat `/auth/change-password` (user tahu password lama) atau `/auth/forgot-password` + `/auth/reset-password` (self-service), sesuai catatan §7.

### GET /employees/:id/schedules?tanggalMulai=&tanggalSelesai=

Riwayat penempatan site 1 karyawan lintas site — beda dari `GET /schedules` di §3 yang scoped ke site-site yang diawasi 1 supervisor tertentu. Menjawab requirement PRD 5.3 ("HR kelola riwayat penempatan site").

**Response:** struktur sama dengan `GET /schedules` di §3 (list jadwal dengan detail site & waktu), scoped ke `karyawanId` dari `:id`, bukan ke supervisor manapun.

### POST /employees/:id/reset-face-registration

Kosongkan `faceEmbedding` karyawan (jadi array kosong) — dipakai kalau wajah karyawan berubah signifikan (kacamata, jenggot, dsb) dan verifikasi jadi sering gagal. Sengaja **tidak self-service** oleh karyawan — mencegah celah fraud identitas (kalau dibuka bebas, siapapun yang pegang device ter-login bisa daftar ulang wajah sendiri, menggantikan rujukan biometrik pemilik asli). Karyawan otomatis diarahkan ke layar registrasi wajah (reuse `/users/me/face-registration`) di login berikutnya, ditandai lewat `wajahTerdaftar: false` di response login.

**Response:** `{ "success": true }`

### POST /sites

Tambah lokasi klien baru.

**Request:** `{ "nama": "string", "alamat": "string", "latitude": number, "longitude": number, "radiusToleransi": "number (opsional, default 75)" }`
**Response:** `{ "id": "uuid", "nama": "string", "alamat": "string", "latitude": number, "longitude": number, "radiusToleransi": number, "statusAktif": true }`

### GET /sites?statusAktif=

List site. Default (tanpa `statusAktif`) tampilkan semua (termasuk nonaktif) — biar histori tetap bisa ditelusuri HR.

**Response:** `[{ "id": "uuid", "nama": "string", "alamat": "string", "latitude": number, "longitude": number, "radiusToleransi": number, "statusAktif": boolean }]`

### PATCH /sites/:id

Koreksi alamat/koordinat/radius toleransi **dan** nonaktifkan/aktifkan kembali site — satu mekanisme, konsisten dengan pola `PATCH /employees/:id` untuk `User`. (Sebelumnya sempat dipisah jadi endpoint `DELETE /sites/:id` tersendiri, dikonsolidasikan kembali ke sini setelah dicek ulang terhadap konvensi REST — lihat `TDD.md` §3 poin 12.)

**Request:** `{ "nama": "string (opsional)", "alamat": "string (opsional)", "latitude": "number (opsional)", "longitude": "number (opsional)", "radiusToleransi": "number (opsional)", "statusAktif": "boolean (opsional)" }`

Set `statusAktif: false` **bukan** hard delete — site nonaktif tetap tersimpan penuh (histori `JadwalShift`/`LogKehadiran` yang merujuk ke site ini tidak hilang), tapi tidak lagi muncul sebagai opsi saat supervisor membuat jadwal baru. Idempotent — mengirim `statusAktif` dengan nilai yang sama seperti kondisi saat ini tetap sukses, tidak error.

**Response:** object site terbaru (termasuk `statusAktif` terkini)

### POST /supervisor-sites · GET /supervisor-sites?supervisorId= · DELETE /supervisor-sites/:id

Kelola mapping supervisor ↔ site yang diawasi (many-to-many). Sengaja jadi endpoint sendiri (bukan field tersembunyi di `/employees`), karena assignment bisa dipicu dari 2 arah — supervisor baru direkrut, ATAU site baru butuh ditempel ke supervisor yang sudah ada.

`GET` versi ini juga dipanggil dari sisi **Supervisor** (§3) untuk menampilkan "site yang saya awasi" di profil — hasilnya di-scope otomatis ke `supervisorId` milik sendiri.

**Request POST:** `{ "supervisorId": "uuid", "siteId": "uuid" }`
**Response POST:** `{ "id": "uuid" }`
**Response GET:** `[{ "id": "uuid", "site": { "id": "uuid", "nama": "string", "alamat": "string" } }]`
**Response DELETE:** `{ "success": true }`

### GET /attendance/summary?periodeMulai=&periodeSelesai=

Rekap kehadiran terkonsolidasi dari satu sumber data — _PP2_

### GET /attendance/attempts?karyawanId=&periodeMulai=&periodeSelesai=

Audit trail setiap percobaan check-in/out (dari `PercobaanAbsensi`, termasuk yang gagal) — bukti konkret saat ada dispute dengan klien/karyawan, langsung menjawab pain point "HR tidak punya bukti konkret untuk verifikasi klaim" di as-is process.

### GET /reports/export?format=pdf|xlsx&periodeMulai=&periodeSelesai=

Generate laporan untuk payroll & pelaporan ke klien.

### GET /leave-requests/history?karyawanId=&periodeMulai=&periodeSelesai=

Audit trail persetujuan izin secara lengkap (read-only) untuk HR/Admin lintas seluruh site dan karyawan.

**Catatan Integrasi Fallback HR:** HR_ADMIN juga memiliki peran sekunder sebagai **fallback approver** untuk izin yang berstatus _orphaned_. Endpoint operasionalnya di-share di Bagian 3:

- `GET /leave-requests?status=PENDING`
- `PATCH /leave-requests/:id/approve` dan `/reject`
  _(Lihat Bagian 3 untuk detail batasan dual-role tersebut)._

**Request:** `karyawanId` (uuid, opsional), `periodeMulai` (ISO-8601 date, opsional), `periodeSelesai` (ISO-8601 date, opsional). Jika parameter periode hanya diisi satu sisi, sistem akan tetap memprosesnya sebagai range terbuka. Filter tanggal diterapkan terhadap `tanggalMulai` pengajuan (konsep: melihat karyawan yang izin mulai dari tanggal tertentu).

**Response:**

```json
[
  {
    "id": "uuid",
    "karyawanId": "uuid",
    "karyawan": { "id": "uuid", "nama": "string" },
    "tanggalMulai": "date",
    "tanggalSelesai": "date",
    "jenis": "SAKIT | IZIN | CUTI",
    "alasan": "string",
    "dokumenPendukungUrl": "string | null",
    "status": "PENDING | APPROVED | REJECTED | CANCELLED",
    "catatanSupervisor": "string | null",
    "approvedById": "uuid | null",
    "approvedBy": { "id": "uuid", "nama": "string" } | null,
    "createdAt": "datetime"
  }
]
```

## 5. Internal API — NestJS ↔ Python Microservice

Tidak diekspos ke mobile app. Dipanggil server-to-server dari NestJS.

### POST /internal/embed

Satu-satunya endpoint microservice — stateless, tidak menyimpan apapun.

**Request:** `{ "foto": "base64 string" }`
**Response:** `{ "embedding": [0.123, "... (vector)"], "liveness": { "isLive": true, "confidence": 0.94 } }`

Dipanggil dari 3 tempat: `/users/me/face-registration`, `/attendance/check-in`, `/attendance/check-out`.

---

## 6. Auto-Mark Absent (Cron)

Cron job yang sama dengan alert T+15 menit diperluas: kalau sampai `jamSelesai`, `LogKehadiran.waktuCheckIn` masih kosong dan tidak ada satupun percobaan sukses — sistem membuat/mengupdate `LogKehadiran` dengan `hasilVerifikasiCheckIn: TIDAK_HADIR`. Status "tidak hadir" jadi tercatat eksplisit di data, bukan disimpulkan dari ketiadaan row — _PP3, PP4_.

---

## 7. Konvensi Umum

- **Status code:** 200, 201, 400, 401, 403, 404, 409 (konflik, misal check-in dobel untuk jadwal yang sama).
- **Tidak ada endpoint register/self-signup** — satu-satunya jalur pembuatan user adalah `POST /employees` oleh HR (lihat §4). Tidak ada reset password manual oleh HR untuk password rutin — itu digantikan self-service via `/auth/forgot-password` + `/auth/reset-password`; pengecualian cuma password awal sekali waktu akun dibuat (lihat `POST /employees`).
- Semua endpoint (kecuali `/auth/*` dan `/internal/*`) wajib header `Authorization: Bearer <token>`, role diverifikasi lewat guard di NestJS.
