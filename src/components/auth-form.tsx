'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowLeft, Coins, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type AuthFormProps = { mode: 'login' | 'register' };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { configured } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const isRegister = mode === 'register';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage('Autentikasi belum aktif. Isi URL dan publishable key Supabase di environment proyek terlebih dahulu.');
      return;
    }
    setBusy(true);
    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace('/');
          router.refresh();
        } else {
          setMessage('Akun berhasil dibuat. Periksa email untuk mengonfirmasi pendaftaran, lalu masuk.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/');
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Terjadi kendala. Coba kembali.');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage('Google OAuth belum aktif. Hubungkan Supabase dan aktifkan provider Google terlebih dahulu.');
      return;
    }
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <span className="brand-mark"><Coins size={19} strokeWidth={2.5} /></span>
          <span className="brand-name">DanaKu</span>
        </Link>
        <div className="auth-quote">
          <h1>Lebih paham uangmu, lebih tenang langkahmu.</h1>
          <p>Catat seperlunya, lihat polanya, dan jaga anggaran tetap sesuai rencana.</p>
        </div>
        <div className="auth-aside-footer">Keuangan pribadi, dibuat lebih jelas.</div>
      </aside>
      <main className="auth-main">
        <section className="auth-card">
          <Link href="/" className="ghost-button" style={{ paddingLeft: 0, marginBottom: 13 }}><ArrowLeft size={14} /> Kembali ke dashboard</Link>
          <h2>{isRegister ? 'Buat akun DanaKu' : 'Senang bertemu lagi'}</h2>
          <p>{isRegister ? 'Mulai catat keuanganmu dengan langkah sederhana.' : 'Masuk untuk melihat ringkasan dan transaksi pribadimu.'}</p>
          <form className="auth-form" onSubmit={submit}>
            {isRegister && (
              <div className="form-field">
                <label htmlFor="name">Nama</label>
                <div className="search-field"><UserRound size={15} /><input id="name" className="form-input" style={{ border: 0, padding: 0, minHeight: 36 }} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama lengkap" required /></div>
              </div>
            )}
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <div className="search-field"><Mail size={15} /><input id="email" type="email" className="form-input" style={{ border: 0, padding: 0, minHeight: 36 }} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" required /></div>
            </div>
            <div className="form-field">
              <label htmlFor="password">Kata sandi</label>
              <div className="search-field"><LockKeyhole size={15} /><input id="password" type={showPassword ? 'text' : 'password'} className="form-input" style={{ border: 0, padding: 0, minHeight: 36 }} autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" minLength={8} required /><button className="ghost-button" type="button" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
            </div>
            <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Memproses…' : isRegister ? 'Buat akun' : 'Masuk'}</button>
          </form>
          <div className="auth-divider">atau lanjutkan dengan</div>
          <button className="google-button" type="button" onClick={() => void signInWithGoogle()} disabled={busy}>
            <span aria-hidden="true" style={{ color: '#4285f4', fontSize: 16, fontWeight: 800 }}>G</span>
            {isRegister ? 'Daftar dengan Google' : 'Masuk dengan Google'}
          </button>
          {message && <div className="toast" role="status">{message}</div>}
          {!configured && <p className="ai-model-note" style={{ marginTop: 14, textAlign: 'center' }}>Tampilan autentikasi sudah siap. Sambungkan Supabase untuk mengaktifkan akun sungguhan.</p>}
          <p className="auth-footnote">{isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <Link href={isRegister ? '/login' : '/register'}>{isRegister ? 'Masuk' : 'Daftar sekarang'}</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
