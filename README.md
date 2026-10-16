# DanaKu

Fondasi aplikasi money-tracking berbahasa Indonesia. Frontend memakai Next.js App Router dan TypeScript. Supabase Auth/Postgres menjadi backend yang direncanakan; Gemini 3.6 Flash (`gemini-3.6-flash`) menangani route AI di server.

## Jalankan lokal

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dari project Supabase. Tanpa nilai ini, dashboard tampil dalam mode demo dan autentikasi/data belum aktif.
3. Untuk mengaktifkan AI, isi `GEMINI_API_KEY` pada environment server. Jangan memakai prefiks `NEXT_PUBLIC_` untuk key ini dan jangan menaruh key di source control.
4. Jalankan `pnpm install`, kemudian `pnpm dev`; buka `http://localhost:3000`.

## Schema dan autentikasi Supabase

Migrasi awal ada di `supabase/migrations/20261016150000_initial_money_tracking.sql`. Migrasi membuat profil, kategori, transaksi, budget harian/bulanan/tahunan, hasil ekstraksi struk, thread/pesan AI, push subscriptions, notifikasi, indeks, trigger profil, Row Level Security dan bucket privat `receipts`. Terapkan migrasi pada project Supabase milikmu lewat Supabase CLI (`supabase db push`) atau SQL Editor setelah meninjau kebijakannya. Aplikasi tidak menerapkan migrasi secara otomatis.

Untuk email/password, aktifkan Supabase Auth Email dan atur kebijakan konfirmasi email. Untuk Google, buat OAuth Client ID bertipe Web di Google Cloud, daftarkan Client ID/Secret di Supabase Auth → Providers → Google, lalu masukkan callback Supabase yang ditampilkan dashboard Supabase ke Authorized redirect URIs Google. Tambahkan URL aplikasi (`http://localhost:3000/auth/callback` saat lokal dan domain produksi) ke Supabase Auth → URL Configuration → Redirect URLs. Kredensial Google belum disediakan atau disimpan oleh proyek ini.

## Konfigurasi AI

Dua route server tersedia: `POST /api/ai/chat` dan `POST /api/ai/receipt`. Keduanya memverifikasi JWT Supabase dan membutuhkan `GEMINI_API_KEY`. Model dapat diatur dengan `GEMINI_MODEL`, default `gemini-3.6-flash`. Foto struk pada tahap ini dikirim ke Gemini untuk ekstraksi dan ditampilkan sebagai draft; file/hasilnya belum otomatis diunggah ke Storage atau disimpan menjadi transaksi.

## Deployment AWS

Proyek menggunakan server Next.js, sehingga target yang sesuai adalah layanan AWS yang mendukung runtime Node/Next.js, misalnya AWS Amplify Hosting. Build command: `pnpm install --frozen-lockfile && pnpm build`; output/runtime mengikuti instruksi Next.js pada layanan yang dipilih. Atur environment variables Supabase publik dan secret Gemini di pengaturan server AWS. Daftar free tier, batas pemakaian, dan kelayakan akun AWS dapat berubah; periksa biaya dan kuota sebelum mengaktifkan layanan.

Push notification sungguhan memerlukan service worker, browser permission, VAPID keys, serta worker/job yang mengirim event saat batas anggaran tercapai. Schema untuk menyimpan subscription dan event sudah disiapkan, tetapi pengiriman push belum diaktifkan.
