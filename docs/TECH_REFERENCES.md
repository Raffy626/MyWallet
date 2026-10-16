# Rujukan teknis resmi

Rujukan ini mencatat sumber resmi yang diperiksa saat menyiapkan schema dan integrasi. Konfigurasi project tetap perlu diselesaikan setelah pengguna memiliki project Supabase dan kredensial Google/Gemini.

- Supabase Next.js App Router quickstart menyarankan project Supabase, publishable key, dan pola autentikasi server-side untuk aplikasi Next.js: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Supabase Google OAuth menjelaskan `signInWithOAuth`, redirect allowlist, dan pertukaran kode PKCE melalui route callback: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase RLS menjelaskan bahwa kebijakan harus disertai grants/revokes yang tepat pada tabel exposed; migrasi DanaKu mengaktifkan RLS dan membatasi tabel aplikasi per akun: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage memakai RLS pada `storage.objects`; bucket struk DanaKu privat dan object path dikunci ke UUID pengguna: https://supabase.com/docs/guides/storage/security/access-control
- Dokumentasi model Google mencantumkan ID stabil `gemini-3.6-flash` dan input teks/gambar; route AI DanaKu menggunakan identifier tersebut di server: https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash

Source yang diperiksa pada 16 Oktober 2026. Kredensial pihak ketiga tidak dikirim ke browser dan tidak dimasukkan ke file project.
