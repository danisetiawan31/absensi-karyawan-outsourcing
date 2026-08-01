# Auth Mobile

## Konteks & tujuan

Implementasi 3 alur autentikasi di mobile: Login, Wajib Ganti Password (gate untuk akun baru), dan Forgot/Reset Password. Fitur ini menyambung langsung ke infrastruktur yang sudah dibangun di Mobile Foundation (authStore, apiClient, routing guard) — tidak membangun ulang state management atau HTTP client.

Screen Login jadi **referensi visual terkunci** pertama sesuai AGENTS.md § Design Reference — screen berikutnya (Wajib Ganti Password, Forgot/Reset Password) WAJIB konsisten ke treatment visual yang dipakai di Login setelah di-approve, bukan menafsir ulang DESIGN.md dari nol.

## Requirement

1. **Login screen** (`(auth)/login`):
   - Form: input email, input password (dengan toggle show/hide), tombol submit "Masuk"
   - Link "Lupa password?" menuju forgot-password screen
   - Hit `POST /auth/login`. Sukses → panggil `setAuth()` dari authStore (authStore Mobile Foundation), lalu:
     - Kalau `wajibGantiPassword === true` → redirect ke `(auth)/change-password-required`
     - Kalau `false` → redirect sesuai `role` (reuse logic routing yang sudah ada di root layout Mobile Foundation, jangan duplikasi)
   - Gagal → tampilkan pesan error di atas tombol submit. Cover minimal 2 kasus: kredensial salah (generic) dan `AKUN_NONAKTIF` (error code spesifik dari API-Contract).
   - Loading state: disable tombol + indikator visual saat request berlangsung.
   - Layout: background polos, card `surface` di tengah berisi form. Tanpa logo/branding.

2. **Wajib Ganti Password screen** (`(auth)/change-password-required`):
   - HANYA bisa diakses lewat redirect dari Login (bukan route bebas navigasi manual) — tidak ada tombol back ke Login/home.
   - Form: password baru + konfirmasi password baru (field konfirmasi validasi client-only, tidak dikirim ke API).
   - Requirement password ditampilkan sebagai teks statis di bawah field (misal "Minimal N karakter") — bukan strength meter. **Angka N WAJIB dicek dari DTO backend aktual** (bukan diasumsikan dari dokumen desain) supaya validasi client match persis dengan validasi server.
   - Hit `POST /auth/change-password` dengan `passwordLama`. Password lama disimpan sementara di
     field transient in-memory (`pendingPasswordLama` di authStore atau store terpisah) — diisi saat
     Login sukses dengan `wajibGantiPassword: true`, dipakai di screen ini, lalu WAJIB di-clear
     segera setelah request selesai (sukses atau gagal). Field ini TIDAK boleh masuk mekanisme
     persist SecureStore yang sudah ada — murni in-memory, hilang kalau app di-kill (dianggap oke,
     user tinggal login ulang).
   - Sukses → redirect sesuai `role` (user sudah punya token valid dari login, tidak perlu login ulang).

3. **Forgot Password screen** (`(auth)/forgot-password`):
   - Form: input email, tombol submit.
   - Hit `POST /auth/forgot-password`. Sukses (response selalu `{success:true}` menurut kontrak, tidak reveal apakah email terdaftar) → langsung lanjut ke Reset Password screen (bukan kembali ke Login).

4. **Reset Password screen** (`(auth)/reset-password`):
   - Form: input token (6 digit, 1 text field polos — bukan kotak OTP terpisah, supaya mendukung paste dari email), password baru + konfirmasi password baru.
   - Requirement password sama seperti screen Wajib Ganti Password (teks statis, angka dicek dari DTO backend).
   - Hit `POST /auth/reset-password`. Sukses → redirect ke Login. Gagal → tampilkan error `TOKEN_TIDAK_VALID`.

5. **Visual — mengacu ke `docs/DESIGN.md`** sebagai konsep dasar (bukan kaku, sesuai AGENTS.md):
   - Warna, tipografi, radius, spacing dasar dari DESIGN.md
   - Primary (`#FFC81E`) dipakai selektif — hanya di tombol submit/CTA utama tiap screen, bukan dominan
   - Tidak ada shadow/gradient, sesuai prinsip flat design

## Tahapan implementasi

- Tahap 1 (Login screen — referensi visual terkunci): UI + validasi client + integrasi `POST /auth/login` + branching redirect (wajibGantiPassword vs role)
- Tahap 2 (Wajib Ganti Password screen): UI + validasi + integrasi `POST /auth/change-password`, konsisten visual ke Tahap 1
- Tahap 3 (Forgot Password screen): UI + integrasi `POST /auth/forgot-password`
- Tahap 4 (Reset Password screen): UI + integrasi `POST /auth/reset-password`
- Tahap 5 (Test): unit test untuk logic kritis tiap screen (lihat Testing di bawah)

(Catatan: tiap tahap di atas masih boleh dipecah lebih kecil lagi saat eksekusi kalau Antigravity/user merasa perlu — ini pengelompokan tingkat spec.)

## Skema/struktur data (kalau relevan)

Tidak ada perubahan schema Prisma. Semua screen konsumsi endpoint yang sudah ada di `API-Contract.md` § 1 (Auth & Profil). Tidak ada field baru di `authStore` di luar yang sudah ada dari Mobile Foundation.

## Edge case yang perlu dihandle

- Login gagal karena `AKUN_NONAKTIF` → pesan error harus beda dari kredensial salah biasa (user perlu tau ini bukan typo password)
- Wajib Ganti Password: user coba navigasi manual (deep link/back button) ke screen ini tanpa datang dari Login sukses → redirect ke Login (state tidak konsisten kalau diakses langsung)
- Forgot Password: email tidak terdaftar → tetap tampilkan sukses (sesuai kontrak, mencegah user enumeration), TIDAK boleh expose informasi apakah email ada di sistem
- Reset Password: token salah/expired → tampilkan `TOKEN_TIDAK_VALID`, user tetap di screen yang sama (bukan redirect balik ke Forgot Password), boleh coba input ulang
- Semua form: validasi client-side dulu (field kosong, format email, panjang password) sebelum hit API — jangan andalkan validasi server doang untuk error yang bisa dicegah di client
- Loading state disable tombol submit — cegah double-submit kalau user tap berkali-kali sebelum response datang

## Testing

- Login: submit dengan kredensial salah → pesan error tampil, tidak redirect
- Login: submit sukses dengan `wajibGantiPassword: true` → redirect ke change-password-required
- Login: submit sukses dengan `wajibGantiPassword: false` → redirect sesuai role
- Login: `AKUN_NONAKTIF` → pesan error spesifik tampil
- Wajib Ganti Password: password + konfirmasi tidak match → error validasi client, tidak hit API
- Wajib Ganti Password: sukses → redirect sesuai role
- Forgot Password: submit → selalu tampil pesan sukses (tidak reveal status email)
- Reset Password: token invalid → pesan `TOKEN_TIDAK_VALID` tampil
- Reset Password: sukses → redirect ke Login

## Kriteria selesai

- 4 screen bisa diakses sesuai alur (Login → Change Password Required kondisional, Login → Forgot → Reset → Login)
- Semua test di atas lolos
- Visual Login sudah direview & di-approve user sebagai referensi visual terkunci untuk screen berikutnya
- Tidak ada `any` di kode yang ditulis (AGENTS.md §9)
- Validasi panjang password di client sudah dicek match dengan DTO backend aktual (bukan asumsi)
- Direview manual oleh user end-to-end di device/emulator
