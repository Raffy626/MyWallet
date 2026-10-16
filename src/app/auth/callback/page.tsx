'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const nextParam = params.get('next') ?? '/';
    const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';
    const problem = !supabase
      ? 'Supabase belum dikonfigurasi untuk menyelesaikan proses masuk.'
      : !code
        ? 'Kode autentikasi tidak ditemukan. Silakan coba masuk kembali.'
        : '';

    if (problem) {
      const timer = window.setTimeout(() => setError(problem), 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;
    void supabase!.auth.exchangeCodeForSession(code!).then(({ error: exchangeError }) => {
      if (!active) return;
      if (exchangeError) setError(exchangeError.message);
      else router.replace(next);
    });
    return () => { active = false; };
  }, [router]);

  return (
    <main className="auth-page" style={{ gridTemplateColumns: '1fr' }}>
      <section className="auth-main">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <span className="brand-mark" style={{ margin: '0 auto 15px' }}><Coins size={20} /></span>
          <h2>{error ? 'Belum berhasil masuk' : 'Menyelesaikan proses masuk…'}</h2>
          <p>{error || 'Tunggu sebentar, kami sedang memverifikasi akunmu.'}</p>
          {error && <Link className="primary-button" href="/login">Kembali ke halaman masuk</Link>}
        </div>
      </section>
    </main>
  );
}
