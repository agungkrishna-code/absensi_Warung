# Warung Attendance

Aplikasi absensi karyawan warung berbasis Next.js App Router, Supabase, dan Cloudflare Pages.
Frontend berupa static export; seluruh akses data melalui Supabase SDK, RLS, dan PostgreSQL RPC.

## Stack

- Next.js 16 (App Router, static export)
- TypeScript + Tailwind CSS + Lucide
- Supabase Auth, PostgreSQL, RLS, RPC
- Cloudflare Pages (`out/`)

## Cara pemakaian

Aplikasi ini punya dua peran: **admin** (pemilik/manajer warung) dan **karyawan**. Semua tampilan berbahasa Indonesia dan waktu ditampilkan dalam WITA (Asia/Makassar).

### Karyawan

1. Buka aplikasi, mis. `https://warung-attendance.pages.dev`.
2. Masuk dengan email dan kata sandi yang diberikan admin. Tombol daftar tidak ada — akun dibuat oleh admin.
3. Di **Dashboard** tampil sapaan, jam WITA, dan status hari ini.
4. Tekan **Check-in** saat mulai bekerja. Tombol berubah jadi **Check-out** setelah berhasil; keduanya hanya bisa sekali per hari.
   - Kalau ada jadwal dan Anda masuk lewat jam mulai shift, status hari ini menjadi **Terlambat**.
   - Tanpa jadwal, status **Hadir**.
5. Lihat riwayat absensi pribadi di menu **Riwayat** (`/attendance`). Data karyawan lain tidak terlihat.

### Admin

1. Masuk dengan akun admin.
2. **Dashboard**: ringkasan hari ini — jumlah hadir, terlambat, tanpa keterangan, dan total karyawan aktif.
3. **Karyawan** (`/employees`): tambah/edit data karyawan (kode, nama, posisi), hubungkan ke akun login, dan aktifkan/nonaktifkan karyawan. Karyawan dinonaktifkan, bukan dihapus, agar riwayatnya tetap tersimpan. Karyawan nonaktif tidak bisa check-in.
4. **Jadwal** (`/schedules`): atur jadwal shift per karyawan per tanggal. Shift selesai di hari yang sama; satu jadwal per karyawan per tanggal.
5. **Riwayat** (`/attendance`): lihat dan saring seluruh absensi (per karyawan, per tanggal), plus ekspor CSV.
6. **Laporan** (`/reports`): rekap bulanan per karyawan (hadir/terlambat/tanpa keterangan), rincian per hari, dan ekspor CSV. File CSV aman dibuka di Excel.

### Akun baru

1. Buat user di Supabase Dashboard → Authentication → Users → Add user (aktifkan **Auto Confirm User**).
2. Login sebagai admin → **Karyawan** → Tambah karyawan → pilih akun tersebut.
3. Untuk admin baru, jalankan di SQL Editor:

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
2. Buka SQL Editor, jalankan `supabase/migrations/0001_init.sql`.
3. Authentication → Providers → Email: aktifkan. Nonaktifkan public sign-up agar akun hanya dibuat admin.
4. Authentication → URL Configuration: tambahkan URL aplikasi (localhost dan Cloudflare Pages).

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

1. Tambahkan user lewat Supabase Dashboard (jangan lewat UI publik).
2. Login sebagai admin → Karyawan → Tambah karyawan → pilih akun login tersebut.

Role tidak dapat diubah dari frontend. Perubahan role hanya lewat SQL/service role.

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

1. Login admin → tambah 2 karyawan → hubungkan masing-masing ke akun login.
2. Tambah jadwal hari ini untuk karyawan A dengan `shift_start` yang sudah lewat.
3. Login karyawan A → check-in → status harus `Terlambat` dan jam masuk terisi.
4. Check-in lagi → harus muncul pesan "sudah check-in"; check-out → berhasil; check-out lagi → ditolak.
5. Login karyawan B → riwayat hanya berisi data B, bukan data A.
6. Buka `/employees` sebagai karyawan B → harus dialihkan ke dashboard.
7. Nonaktifkan karyawan A sebagai admin → check-in A harus ditolak.
8. Buka laporan bulan ini → angka hadir/terlambat/tanpa keterangan sesuai data; ekspor CSV terbuka rapi di Excel.
9. Buka di layar ponsel → navigasi bawah, form, dan tabel tetap bisa dipakai.

## Build dan deploy

```bash
npm run build
```

Output statis ada di `out/`. Perintah build juga menjalankan `scripts/fix-static-export-segments.mjs` untuk meratakan file prefetch RSC yang ditulis Next.js 16 ke folder bersarang di Windows. Di Linux/Cloudflare Pages script tersebut tidak melakukan perubahan.

Cloudflare Pages:

- Framework preset: None
- Build command: `npm run build`
- Build output directory: `out`
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Node version: 22 atau lebih baru

Nilai `NEXT_PUBLIC_*` di-inline saat build, jadi variabel harus sudah diatur sebelum build Cloudflare Pages.

## Struktur

```
src/app/{login,dashboard,employees,attendance,schedules,reports}
src/components   # shell, auth provider, UI
src/lib          # supabase client, utils
src/types
supabase/migrations
```

## Keamanan

- RLS aktif pada semua tabel aplikasi.
- Karyawan hanya dapat membaca data miliknya.
- Penulisan absensi hanya melalui RPC `SECURITY DEFINER` dengan `search_path` tetap.
- Role tidak dipercaya dari frontend dan dilindungi trigger.
- CSV export dilindungi dari formula injection.
- `public/_headers` menambahkan header keamanan dasar dan cache aset statis di Cloudflare Pages.

## Lisensi

Untuk penggunaan internal warung. Tidak dilisensikan untuk distribusi publik.
