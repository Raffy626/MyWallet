'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save, UserRound } from 'lucide-react';
import { DemoBanner } from '@/components/demo-banner';
import { useAuth } from '@/components/auth-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState('Pengguna DanaKu');
  const [currency, setCurrency] = useState('IDR');
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;
    void supabase.from('profiles').select('display_name,preferred_currency').eq('id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setLoadError('Profil belum dapat dimuat. Pastikan migrasi Supabase telah diterapkan.');
        else {
          setLoadError('');
          setName(data?.display_name ?? String(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Pengguna DanaKu'));
          setCurrency(data?.preferred_currency?.trim() || 'IDR');
        }
        setLoadedForUser(user.id);
      });
    return () => { active = false; };
  }, [user]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { setMessage('Masuk ke akun Supabase untuk menyimpan profil.'); return; }
    if (loadedForUser !== user.id || loadError) { setMessage('Profil belum selesai dimuat; perubahan tidak disimpan agar data lama tidak tertimpa.'); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.from('profiles').update({ display_name: name.trim(), preferred_currency: currency }).eq('id', user.id).select('id').single();
    if (error) setMessage(error.message);
    else {
      await supabase.auth.updateUser({ data: { full_name: name.trim() } });
      setMessage('Profil berhasil diperbarui.');
    }
  }

  const ready = !user || loadedForUser === user.id;
  const displayName = ready ? name : 'Memuat profil…';
  return (
    <div className="page-content">
      {!user && <DemoBanner />}
      <div className="dashboard-intro"><div><h2>Profil kamu</h2><p>Informasi ini membantu DanaKu menampilkan pengalaman yang sesuai.</p></div></div>
      <div className="profile-layout">
        <section className="panel"><div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}><span className="avatar large">{displayName.slice(0, 1).toUpperCase()}</span><div><strong style={{ display: 'block', fontSize: 14 }}>{displayName}</strong><span className="panel-subtitle">{user?.email ?? 'Hubungkan akun untuk mengedit profil'}</span></div></div><form onSubmit={save}><div className="form-grid"><div className="form-field full"><label htmlFor="profile-name">Nama tampilan</label><input id="profile-name" className="form-input" value={user && !ready ? '' : name} onChange={(event) => setName(event.target.value)} maxLength={80} disabled={Boolean(user && !ready) || Boolean(loadError)} /></div><div className="form-field"><label htmlFor="profile-email">Email</label><input id="profile-email" className="form-input" value={user?.email ?? 'Belum terhubung'} disabled /></div><div className="form-field"><label htmlFor="profile-currency">Mata uang utama</label><select id="profile-currency" className="form-select" value={user && !ready ? '' : currency} onChange={(event) => setCurrency(event.target.value)} disabled={Boolean(user && !ready) || Boolean(loadError)}><option value="" disabled>Memuat…</option><option value="IDR">Rupiah (IDR)</option><option value="USD">US Dollar (USD)</option></select></div></div>{loadError && <div className="toast" role="alert">{loadError}</div>}{message && <div className="toast" role="status">{message}</div>}<div className="modal-footer"><button className="primary-button" type="submit" disabled={Boolean(user && (!ready || loadError))}><Save size={14} /> Simpan profil</button></div></form></section>
        <aside className="panel"><span className="metric-icon"><UserRound size={16} /></span><h3 className="panel-title" style={{ marginTop: 13 }}>Privasi akun</h3><p className="panel-subtitle" style={{ lineHeight: 1.7 }}>Profil dan transaksi disimpan di Supabase. Row Level Security membatasi data agar hanya dapat dibaca dan diubah oleh akun pemiliknya.</p><div className="status-pill" style={{ marginTop: 8 }}>{user ? 'Akun tersambung' : 'Mode pratinjau'}</div></aside>
      </div>
    </div>
  );
}
