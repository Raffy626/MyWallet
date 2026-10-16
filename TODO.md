# DanaKu — status implementasi

## Fondasi database Supabase
- [x] Buat schema Postgres untuk aplikasi money tracking. Schema mencakup profil pengguna, kategori, catatan transaksi, anggaran/batas pemakaian harian-bulanan-tahunan, hasil ekstraksi struk, percakapan agent AI, langganan push notification, dan event notifikasi. Migrasi menyiapkan indeks, relasi, batasan nilai, timestamp pembaruan, Row Level Security agar pengguna hanya dapat mengakses datanya sendiri, serta bucket struk privat yang dibatasi ke folder pemilik. Sintaks SQL dan test pgTAP diparse; belum dieksekusi pada project Supabase nyata.

## Kerangka Next.js dan dashboard responsif
- [x] Gunakan Next.js untuk frontend dan buat dashboard sebagai halaman utama. Dashboard mengikuti referensi yang dilampirkan: navigasi hijau gelap, permukaan putih/off-white, ringkasan angka, grafik, serta kartu analitik; layout tetap usable di mobile. Data contoh hanya terlihat dalam mode demo; akun terhubung memakai agregasi transaksi dan budget Supabase.
- [x] Gunakan satu ekosistem visual yang sama pada halaman dashboard, transaksi, laporan, AI assistant, profile, dan settings. Route manifest memuat seluruh sembilan halaman.

## Autentikasi Supabase
- [ ] Sediakan alur register, login, dan logout. Usahakan login maupun register dapat memakai akun Google; alur email/password juga tersedia. Redirect OAuth memakai callback yang aman dan konfigurasi Supabase/Google terdokumentasi. Komponen serta callback sudah dibuat, tetapi pengujian login langsung menunggu project Supabase dan provider OAuth pengguna.

## CRUD transaksi dan upload struk berbantuan AI
- [x] Sediakan operasi create, read, update, dan delete untuk catatan pemasukan/pengeluaran dengan nominal, kategori, tanggal, catatan, dan keterangan melalui Supabase; mode demo hanya menyimpan perubahan sementara.
- [x] Izinkan pilih/upload gambar struk pembayaran dan gunakan AI untuk mengekstrak rincian transaksi. Hasil ekstraksi muncul sebagai draft yang dapat ditinjau dan dikoreksi sebelum disimpan sebagai transaksi. Gambar belum diarsipkan otomatis ke Storage.
- [x] Rahasia model AI disimpan server-side; model yang dipilih adalah Gemini 3.6 Flash (`gemini-3.6-flash`). Route memerlukan `GEMINI_API_KEY` dan Supabase session agar dapat dipanggil.

## Agent AI dan laporan
- [x] Tambahkan agent AI untuk mempermudah pengguna, dengan percakapan yang disimpan per akun pada tabel AI dan dibatasi RLS. Pemanggilan Gemini live tetap menunggu kunci server.
- [ ] Sediakan generate laporan harian, bulanan, dan tahunan. Selector serta tampilan contoh tersedia; perhitungan periode dari transaksi akun belum selesai.
- [x] Sediakan grafik sesuai referensi yang menggambarkan tren transaksi dan penggunaan anggaran; chart dashboard menggunakan transaksi periode berjalan.

## Batas pemakaian dan push notification
- [x] Pengguna dapat menginput batas uang harian, bulanan, dan tahunan. Nilai tersimpan di tabel budgets; form membaca nilai akun sebelum mengizinkan edit.
- [ ] Push notification mengingatkan saat pemakaian mencapai atau melewati batas periode yang telah diinput pengguna. Schema dan kontrol pengingat tersedia, tetapi service worker, izin browser, VAPID, dan pengirim event belum diaktifkan.

## Profile, settings, deployment
- [x] Tambahkan halaman Profile dan Settings dengan warna serta desain yang sama agar tetap satu ecosystem. Profile dan batas akun dibaca sebelum diedit.
- [x] Gunakan Supabase sebagai BaaS dan Supabase Postgres sebagai database. Project URL dan publishable key belum diberikan, sehingga operasi live belum dapat diuji.
- [ ] Siapkan deployment AWS pada opsi Free Tier, tanpa mengekspos secret; tampilkan asumsi dan langkah setup yang memerlukan akun/credential pengguna. Panduan target Node/Next/AWS Amplify tersedia; aplikasi belum dideploy dan kelayakan Free Tier perlu diperiksa pada akun AWS.

## Bukti validasi dan blocker

Production build, lint, dan typecheck berhasil. Manifest dan semua halaman mengembalikan HTTP 200; kedua API Gemini menolak request tanpa sesi (401). `pglast` mem-parse migrasi dan pgTAP. Tidak tersedia Supabase CLI, PostgreSQL client, Docker, atau kredensial layanan di lingkungan ini, sehingga migrasi/RLS/Google/Gemini/push belum dapat diuji secara live.
