# Rencana DanaKu

## Sasaran dan cakupan

Membangun fondasi aplikasi pelacakan uang pribadi berbahasa Indonesia dengan Next.js App Router, Supabase BaaS/Postgres, autentikasi Supabase, dan tampilan dashboard responsif. Tahap ini menyiapkan migrasi schema Supabase, kerangka dashboard serta halaman masuk/daftar, dan titik integrasi AI Gemini. Lingkup produk yang lebih luas tetap mencakup CRUD transaksi, upload dan ekstraksi struk, agent AI, laporan, grafik, batas anggaran, push notification, profil, pengaturan, dan deployment AWS Free Tier. Layanan eksternal belum dikonfigurasi karena URL/kunci proyek Supabase, kredensial Google OAuth, kunci Gemini, dan akun AWS belum diberikan.

## Arsitektur implementasi

- **Frontend:** Next.js App Router dengan TypeScript dan Tailwind CSS. Route Handler server-side menjadi tempat untuk pemrosesan AI dan operasi yang memerlukan rahasia; tidak ada service-role key atau Gemini API key di bundle browser.
- **Auth dan data:** Supabase Auth mengelola email/password dan Google OAuth. Supabase Postgres menjadi sumber data; migrasi SQL membentuk profil, kategori, transaksi, anggaran, hasil pembacaan struk, sesi percakapan AI, langganan push, dan event notifikasi. RLS membatasi data milik pengguna. Supabase Storage memakai bucket struk privat dengan kebijakan folder per pengguna.
- **AI:** Gemini API memakai model `gemini-3.6-flash`. Frontend menyiapkan alur upload/review struk dan panel agent; API key disimpan hanya sebagai secret server ketika integrasi diaktifkan. Tidak ada kunci dummy maupun klaim bahwa model sudah dapat dipanggil tanpa kredensial.
- **Deployment:** struktur Next.js dipertahankan kompatibel dengan hosting Node/Next di AWS. Instruksi ini menargetkan opsi AWS Free Tier, tetapi tidak melakukan deploy atau menjamin ketersediaan/biaya Free Tier tanpa akun dan pemeriksaan kelayakan AWS.

## Sistem desain

### Arah desain yang dipilih

**Dashboard finansial editorial yang tenang**, mengikuti referensi yang diberikan: sidebar hijau gelap, latar putih pudar, kartu analitik terang, aksen hijau, dan visualisasi yang mudah dibaca.

- **Prinsip inti:** keterbacaan angka didahulukan; hierarki dashboard konsisten; tindakan utama mudah dijangkau; layout menyusut dengan alami pada ponsel.
- **Filosofi warna:** hijau hutan menandakan kendali dan kestabilan; hijau segar menjadi aksen positif; kanvas hangat dan garis tipis membantu penggunaan lama tanpa mengaburkan indikator finansial.
- **Paradigma layout:** navigasi vertikal yang menetap pada desktop dan berpindah ke drawer/bottom navigation pada layar kecil; area utama berbasis ringkasan lalu tren dan transaksi terbaru.
- **Elemen khas:** simbol wordmark berbentuk daun/koin; badge batas anggaran berbentuk pil; grafik garis berisi kisi halus.
- **Interaksi dan animasi:** feedback cepat pada aksi simpan, validasi inline, transisi ringan 150–220 ms untuk drawer/kartu; hormati `prefers-reduced-motion`, tanpa animasi angka yang mengganggu.
- **Tipografi:** Inter untuk UI dan angka, dengan ukuran angka metrik yang besar, judul ringkas, dan teks bantu sekunder berkontras cukup.
- **Esensi merek:** pendamping keuangan harian yang sederhana, aman, dan membantu pengguna melihat pola belanja; sifat: jelas, tenang, suportif.
- **Suara merek:** lugas, tidak menghakimi, fokus pada tindakan. Contoh: “Uangmu terpantau, keputusanmu lebih ringan.” dan “Anggaran bulan ini terpakai 62%.”
- **Wordmark/logo:** ikon daun-koin geometris dengan dua garis seperti aliran kas, disandingkan dengan tulisan DanaKu.
- **Warna merek utama:** hijau hutan `#0F3D33`; warna pendukung mencakup hijau aksen, putih gading, dan netral batu.

## Halaman dan struktur proyek

- `/`: dashboard ringkasan, batas pemakaian, grafik, dan transaksi terbaru.
- `/login`, `/register`, `/auth/callback`: autentikasi email serta jalur OAuth Google.
- `/transactions`, `/reports`, `/assistant`, `/profile`, `/settings`: kerangka navigasi/halaman produk yang bertumbuh dalam sistem desain yang sama.
- `src/app/`: App Router, route handlers dan route halaman.
- `src/components/`: shell dashboard, navigasi, kartu metrik, grafik, transaksi, form dan elemen UI bersama.
- `src/lib/supabase/`: klien browser/server dan helper auth/data.
- `src/lib/`: formatter Rupiah, model domain, contoh data dan utilitas.
- `supabase/migrations/`: schema, indeks, trigger, RLS policies, seed kategori standar, dan kebijakan bucket struk privat.
- `public/`: manifest route untuk preview dan ikon/service worker bila diperlukan.

## Batas integrasi tahap ini

Aplikasi bisa menjalankan preview UI tanpa akun layanan dengan data demo yang diberi label. Operasi autentikasi/data eksternal baru aktif setelah nilai Supabase diisi. Google OAuth perlu diaktifkan pada Supabase dan Google Cloud; Gemini memerlukan `GEMINI_API_KEY` di server. Pengiriman push membutuhkan konfigurasi VAPID dan service worker, lalu dijalankan melalui layanan/pekerjaan terjadwal; schema tahap ini menyiapkan penyimpanan subscription dan event, bukan mengirim notifikasi ke perangkat sebelum kredensial tersedia.
