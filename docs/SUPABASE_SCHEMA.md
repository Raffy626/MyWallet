# Schema Supabase DanaKu

Migrasi yang dapat dijalankan ada di [`supabase/migrations/20261016150000_initial_money_tracking.sql`](../supabase/migrations/20261016150000_initial_money_tracking.sql). Schema ini menggunakan UUID, relasi ke `auth.users`, enum transaksi/periode/status, timestamp, indeks, trigger profil, serta RLS.

## Tabel dan hubungan

- **`profiles`** — profil aplikasi yang memakai `id` sama dengan `auth.users.id`; dibuat otomatis saat akun baru terdaftar. Menyimpan nama tampilan, avatar, mata uang, dan zona waktu.
- **`categories`** — kategori pemasukan/pengeluaran. Baris dengan `user_id IS NULL` adalah kategori bawaan yang dapat dibaca pengguna; kategori buatan pengguna dimiliki satu akun. `transactions.category_id` opsional merujuk ke sini.
- **`transactions`** — pemasukan/pengeluaran: `user_id`, jenis, nominal positif, label kategori, judul, merchant, catatan, waktu, path struk, dan sumber (`manual`, `receipt`, `import`). Ada indeks pemilik/waktu dan pemilik/jenis/waktu.
- **`budgets`** — satu batas nominal per pengguna dan periode (`daily`, `monthly`, `yearly`) dengan tanggal awal/akhir, ambang notifikasi, dan pengaturan notifikasi. Kunci unik pengguna/periode/tanggal awal mendukung upsert.
- **`receipt_scans`** — metadata proses pembacaan struk: path bucket, status, JSON hasil ekstraksi, model, pesan error, dan transaksi yang dipilih setelah review.
- **`ai_threads`** dan **`ai_messages`** — thread agent dan pesan berurutan. Policies memeriksa bahwa akun memiliki thread yang dirujuk.
- **`push_subscriptions`** — endpoint, kunci enkripsi Web Push, perangkat, dan status aktif; setiap baris dibatasi pada pemiliknya.
- **`notifications`** — event pengingat batas atau sistem dengan kunci idempotensi per akun; pengguna dapat membaca dan menandai `read_at`.

## Akses dan keamanan

Setiap tabel aplikasi mengaktifkan Row Level Security. Policies menggunakan `auth.uid()` untuk mengikat baris ke pemilik. Pengguna tidak dapat mengubah kategori bawaan. Notifikasi dibuat oleh backend dan hanya kolom `read_at` yang dapat diubah pengguna. Bucket Storage `receipts` bersifat privat; nama objek harus diawali UUID pengguna, misalnya `<user-id>/<filename>`.

Jangan menaruh service-role key atau Gemini API key pada browser. Kunci Gemini hanya dibaca oleh route handler server. Migrasi belum diterapkan ke project Supabase tertentu karena belum ada project URL/credential yang diberikan.
