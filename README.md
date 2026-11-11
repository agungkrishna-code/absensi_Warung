# Warung Attendance

Aplikasi absensi karyawan warung berbasis Next.js App Router, Supabase, dan Cloudflare Pages.
Frontend berupa static export; seluruh akses data melalui Supabase SDK, RLS, dan PostgreSQL RPC.
Operasi istimewa (membuat/menghapus akun Auth) dijalankan lewat Supabase Edge Function yang memverifikasi role admin.

## Stack

- Next.js 16 (App Router, static export)
- TypeScript + Tailwind CSS + Phosphor Icons (Iconify)
- Supabase Auth, PostgreSQL, RLS, RPC, Edge Functions (Deno)
- Cloudflare Pages (`out/`)

## Cara pemakaian

Aplikasi ini punya dua peran: **admin** (pemilik/manajer warung) dan **karyawan**. Semua tampilan berbahasa Indonesia dan waktu ditampilkan dalam WITA (Asia/Makassar).

### Karyawan

1. Buka aplikasi, mis. `https://warung-attendance.pages.dev`.
2. Masuk dengan email **atau username** dan kata sandi yang diberikan admin. Tombol daftar tidak ada — akun dibuat oleh admin.
3. Di **Dashboard** tampil sapaan, jam WITA, dan status hari ini.
4. Tekan **Check-in** saat mulai bekerja. Tombol berubah jadi **Check-out** setelah berhasil; keduanya hanya bisa sekali per hari.
   - Kalau ada jadwal dan Anda masuk lewat jam mulai shift, status hari ini menjadi **Terlambat**.
   - Tanpa jadwal, status **Hadir**.
5. Lihat riwayat absensi pribadi di menu **Riwayat** (`/attendance`). Data karyawan lain tidak terlihat.

### Admin

1. Masuk dengan akun admin.
2. **Dashboard**: ringkasan hari ini — jumlah hadir, terlambat, tanpa keterangan, dan total karyawan aktif.
3. **Karyawan** (`/employees`): tambah/edit data karyawan (kode, nama, posisi), hubungkan ke akun login, atur username, dan aktifkan/nonaktifkan karyawan. Admin juga dapat membuat akun login baru (email, password awal, username) langsung dari form ini. Karyawan dinonaktifkan, bukan dihapus, agar riwayatnya tetap tersimpan. Karyawan nonaktif tidak bisa check-in.
4. **Jadwal** (`/schedules`): atur jadwal shift per karyawan per tanggal. Shift selesai di hari yang sama; satu jadwal per karyawan per tanggal.
5. **Riwayat** (`/attendance`): lihat dan saring seluruh absensi (per karyawan, per tanggal), plus ekspor CSV.
6. **Laporan** (`/reports`): rekap bulanan per karyawan (hadir/terlambat/tanpa keterangan), rincian per hari, dan ekspor CSV. File CSV aman dibuka di Excel.

### Akun baru

1. Login sebagai admin → **Karyawan** → Tambah karyawan → pilih **Buat akun login baru**.
2. Isi nama lengkap, email, password awal (minimal 8 karakter), dan username.
3. Simpan. Akun Auth dibuat lewat Edge Function `create-employee-account` dan langsung terhubung ke karyawan.
4. Sampaikan email (atau username) dan password awal kepada karyawan secara aman.

Email dan username sama-sama bisa dipakai untuk login. Username harus unik tanpa membedakan kapitalisasi. Jika penyimpanan karyawan gagal setelah akun dibuat, aplikasi memanggil `delete-employee-account` untuk membersihkan akun Auth tersebut.

Akun juga masih bisa dibuat manual lewat Supabase Dashboard → Authentication → Users → Add user (aktifkan **Auto Confirm User**), lalu hubungkan di form karyawan.

Untuk admin baru, jalankan di SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'email@contoh.com';
```

## Setup lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Isi `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Jangan pernah memakai `service_role` key di frontend.

## Setup Supabase

1. Buat project Supabase.
2. Buka SQL Editor, jalankan migrasi secara berurutan:
   - `supabase/migrations/0001_init.sql` — skema, RLS, trigger profil, dan RPC absensi.
   - `supabase/migrations/0002_harden_function_grants.sql` — pembatasan hak eksekusi fungsi.
   - `supabase/migrations/0003_username_login.sql` — kolom username, indeks unik, RPC `email_for_username`, dan izin admin.
3. Authentication → Providers → Email: aktifkan. Nonaktifkan public sign-up agar akun hanya dibuat admin.
4. Authentication → URL Configuration: tambahkan URL aplikasi (localhost dan Cloudflare Pages).
5. Deploy Edge Function untuk pembuatan akun (lihat bagian berikut).

### Deploy Edge Function

Akun Auth dibuat dan dihapus lewat dua fungsi:

- `create-employee-account` — membuat akun Auth baru, hanya untuk admin.
- `delete-employee-account` — menghapus akun Auth saat penyimpanan karyawan gagal, hanya untuk admin.

```bash
supabase functions deploy create-employee-account
supabase functions deploy delete-employee-account
```

Fungsi memakai variabel lingkungan bawaan Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), jadi tidak perlu secret tambahan. `service_role` key hanya ada di sisi Supabase dan tidak pernah dikirim ke browser.

### Membuat admin pertama

1. Authentication → Users → Add user (email + password). Aktifkan **Auto Confirm User**.
2. Di SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@warung.id';
```

Trigger `handle_new_user` otomatis membuat profil dengan role `employee`.

### Membuat akun karyawan

1. Login sebagai admin → Karyawan → Tambah karyawan.
2. Pilih **Buat akun login baru**, isi email, password awal, dan username. Akun dibuat dan dihubungkan otomatis saat karyawan disimpan.
3. Atau pilih akun yang sudah ada bila user dibuat manual lewat Supabase Dashboard.

Role tidak dapat diubah dari frontend. Perubahan role hanya lewat SQL/service role.

## Aturan login dan username

- Login menerima **email atau username**. Username dicari lewat RPC `email_for_username`, sehingga daftar email tidak dibuka ke browser.
- Username unik tanpa membedakan kapitalisasi dan spasi di awal/akhir (indeks unik pada `lower(btrim(username))`).
- Format username: 3–30 karakter, hanya huruf kecil, angka, titik, garis bawah, dan tanda hubung.
- Username hanya dapat diubah oleh admin dari halaman Karyawan. Email dan role tetap terkunci.
- Akun dibuat admin; tidak ada pendaftaran publik.

## Aturan absensi

- `record_check_in()` dan `record_check_out()` memakai `auth.uid()`; ID karyawan dan timestamp tidak dikirim dari browser.
- Tanggal kerja dihitung dengan `Asia/Makassar`; timestamp disimpan sebagai `TIMESTAMPTZ`.
- Satu absensi per karyawan per tanggal (`unique (employee_id, work_date)`).
- Status `late` dihitung saat check-in bila ada jadwal dan waktu check-in melewati `shift_start`.
- Tanpa jadwal: check-in tetap diizinkan, status `present`.
- Karyawan nonaktif tidak dapat check-in/check-out.
- Shift harus selesai di hari yang sama (MVP).

## Checklist uji manual

Setelah migrasi dijalankan dan dua akun uji tersedia:

1. Login admin → tambah karyawan A dengan **Buat akun login baru** (email, password 8+ karakter, username).
2. Login karyawan A memakai email, lalu ulangi dengan username → keduanya harus berhasil.
3. Coba buat akun dengan email yang sudah dipakai, password kurang dari 8 karakter, dan username yang sudah dipakai → harus muncul pesan yang sesuai.
4. Tambah karyawan B → hubungkan ke akun login yang sudah ada.
5. Tambah jadwal hari ini untuk karyawan A dengan `shift_start` yang sudah lewat.
6. Login karyawan A → check-in → status harus `Terlambat` dan jam masuk terisi.
7. Check-in lagi → harus muncul pesan "sudah check-in"; check-out → berhasil; check-out lagi → ditolak.
8. Login karyawan B → riwayat hanya berisi data B, bukan data A.
9. Buka `/employees` sebagai karyawan B → harus dialihkan ke dashboard.
10. Nonaktifkan karyawan A sebagai admin → check-in A harus ditolak.
11. Buka laporan bulan ini → angka hadir/terlambat/tanpa keterangan sesuai data; ekspor CSV terbuka rapi di Excel.
12. Buka di layar ponsel → navigasi bawah, form, dan tabel tetap bisa dipakai.

## Build dan deploy

Project Cloudflare Pages: **`warung-attendance`** → https://warung-attendance.pages.dev

Saat ini project memakai **direct upload** (tidak terhubung ke GitHub), jadi:

- `git push` **tidak** otomatis men-deploy apa pun.
- Build dijalankan di komputer sendiri, lalu folder `out/` diunggah dengan wrangler.
- Production branch project ini bernama **`main`**.

### Build lokal

```bash
npm install          # sekali saja
npm run build
```

Hasil build ada di `out/`. Perintah build juga menjalankan `scripts/fix-static-export-segments.mjs` untuk meratakan file prefetch RSC yang ditulis Next.js 16 ke folder bersarang di Windows; di Linux script tersebut tidak melakukan perubahan.

Nilai `NEXT_PUBLIC_*` **di-inline saat build**. Karena build terjadi di lokal, variabel dibaca dari `.env.local` — bukan dari Environment Variables di dashboard Cloudflare. Jika `.env.local` berubah, build harus diulang.

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Deploy (manual, cara yang dipakai)

1. Login wrangler (sekali saja per komputer):

   ```bash
   npx wrangler login
   npx wrangler whoami
   ```

2. Build versi terbaru:

   ```bash
   npm run build
   ```

3. Unggah ke production:

   ```bash
   npx wrangler pages deploy out --project-name warung-attendance --branch main
   ```

4. Cek hasilnya di https://warung-attendance.pages.dev (buka jendela incognito atau hard refresh bila masih terlihat versi lama).

> **Penting:** `--branch main` wajib. Tanpa itu wrangler memakai branch git lokal (`master`), dan hasilnya hanya deployment **Preview** di `https://master.warung-attendance.pages.dev` — situs production tidak berubah.

### Verifikasi deployment

```bash
npx wrangler pages deployment list --project-name warung-attendance
```

Deployment terbaru harus bertanda **Environment: Production**, **Branch: main**, dan **Source** sama dengan commit terakhir. URL `https://<id>.warung-attendance.pages.dev` pada baris itu adalah build yang sedang aktif.

### Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| Situs production tidak berubah | Deploy masuk ke Preview. Cek kolom Environment; ulangi dengan `--branch main`. |
| Masih tampil versi lama | Cache browser. Hard refresh (Ctrl+Shift+R) atau buka mode incognito. |
| `Project not found` / gagal upload | Belum login atau akun Cloudflare salah. Jalankan `npx wrangler login`, lalu cek `npx wrangler pages project list`. |
| Halaman kosong / data Supabase tidak muncul | `.env.local` kosong atau salah saat build. Perbaiki, lalu `npm run build` dan deploy ulang. |
| `npm run build` gagal | Jalankan `npm run typecheck` untuk melihat error TypeScript lebih jelas. |

### Opsional: deploy otomatis lewat GitHub

Bila ingin `git push` langsung men-deploy, hubungkan repo `agungkrishna-code/absensi_Warung` di Cloudflare Dashboard → Workers & Pages → project → Settings → Builds & deployments, dengan konfigurasi:

- Framework preset: None
- Build command: `npm run build`
- Build output directory: `out`
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Node version: 22 atau lebih baru

Setelah itu deployment manual tidak diperlukan lagi. Jangan mencampur keduanya tanpa memastikan production branch Cloudflare sama dengan branch yang di-push.

### Deploy perubahan Supabase

Deploy Cloudflare hanya mengunggah frontend. Perubahan database dan akun tetap dilakukan terpisah:

```bash
# migrasi: jalankan file di supabase/migrations lewat SQL Editor, berurutan
supabase functions deploy create-employee-account
supabase functions deploy delete-employee-account
```

## Struktur

```
src/app/{login,dashboard,employees,attendance,schedules,reports}
src/components   # shell, auth provider, UI
src/lib          # supabase client, utils
src/types
supabase/migrations          # 0001 init, 0002 grants, 0003 username
supabase/functions           # create-employee-account, delete-employee-account
```

## Keamanan

- RLS aktif pada semua tabel aplikasi.
- Karyawan hanya dapat membaca data miliknya.
- Penulisan absensi hanya melalui RPC `SECURITY DEFINER` dengan `search_path` tetap.
- Role tidak dipercaya dari frontend dan dilindungi trigger.
- Pembuatan/penghapusan akun Auth hanya lewat Edge Function yang memverifikasi sesi dan role admin. `service_role` key tidak pernah dikirim ke browser.
- Login username memakai RPC `email_for_username` agar email pengguna lain tidak terekspos.
- CSV export dilindungi dari formula injection.
- `public/_headers` menambahkan header keamanan dasar dan cache aset statis di Cloudflare Pages.

## Lisensi

Untuk penggunaan internal warung. Tidak dilisensikan untuk distribusi publik.
