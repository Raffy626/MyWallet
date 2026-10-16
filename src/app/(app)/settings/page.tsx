'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BellRing, Save, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { DemoBanner } from '@/components/demo-banner';
import { useAuth } from '@/components/auth-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type BudgetRow = { period: 'daily' | 'monthly' | 'yearly'; limit_amount: number | string; alert_threshold_percent: number; notifications_enabled: boolean };

function budgetStarts() {
  const now = new Date();
  return {
    daily: now.toISOString().slice(0, 10),
    monthly: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    yearly: `${now.getFullYear()}-01-01`,
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [daily, setDaily] = useState('250000');
  const [monthly, setMonthly] = useState('5500000');
  const [yearly, setYearly] = useState('60000000');
  const [notify, setNotify] = useState(true);
  const [threshold, setThreshold] = useState('80');
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const starts = budgetStarts();
    let active = true;
    const periods = ['daily', 'monthly', 'yearly'] as const;
    void Promise.all(periods.map((period) => supabase.from('budgets')
      .select('period,limit_amount,alert_threshold_percent,notifications_enabled')
      .eq('user_id', user.id).eq('period', period).eq('starts_on', starts[period]).maybeSingle()))
      .then((results) => {
        if (!active) return;
        const error = results.find((result) => result.error)?.error;
        if (error) {
          setLoadError('Batas belum dapat dimuat. Pastikan migrasi Supabase telah diterapkan.');
        } else {
          setLoadError('');
          const rows = results.map((result) => result.data as BudgetRow | null);
          setDaily(rows[0] ? String(rows[0].limit_amount) : '');
          setMonthly(rows[1] ? String(rows[1].limit_amount) : '');
          setYearly(rows[2] ? String(rows[2].limit_amount) : '');
          const preference = rows[1] ?? rows.find((row) => row !== null);
          setNotify(preference?.notifications_enabled ?? true);
          setThreshold(String(preference?.alert_threshold_percent ?? 80));
        }
        setLoadedForUser(user.id);
      });
    return () => { active = false; };
  }, [user]);

  async function saveBudgets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { setMessage('Masuk untuk menyimpan batas ke akun. Di pratinjau, nilainya belum tersimpan.'); return; }
    if (loadedForUser !== user.id || loadError) { setMessage('Batas belum selesai dimuat; data tidak disimpan agar pengaturan lama tidak tertimpa.'); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const starts = budgetStarts();
    const budgets = [
      { period: 'daily', limit_amount: Number(daily), starts_on: starts.daily },
      { period: 'monthly', limit_amount: Number(monthly), starts_on: starts.monthly },
      { period: 'yearly', limit_amount: Number(yearly), starts_on: starts.yearly },
    ].map((row) => ({ ...row, user_id: user.id, alert_threshold_percent: Number(threshold), notifications_enabled: notify }));
    const { error } = await supabase.from('budgets').upsert(budgets, { onConflict: 'user_id,period,starts_on' });
    setMessage(error ? error.message : 'Batas penggunaan berhasil disimpan.');
  }

  const ready = !user || loadedForUser === user.id;
  const dailyValue = user ? ready ? daily : '' : daily;
  const monthlyValue = user ? ready ? monthly : '' : monthly;
  const yearlyValue = user ? ready ? yearly : '' : yearly;

  return (
    <div className="page-content">
      {!user && <DemoBanner />}
      <div className="dashboard-intro"><div><h2>Pengaturan</h2><p>Atur batas pemakaian dan pengingat sesuai kebiasaanmu.</p></div></div>
      <div className="profile-layout">
        <section className="panel"><div className="panel-header"><div><h3 className="panel-title">Batas penggunaan uang</h3><p className="panel-subtitle">Tentukan batas terpisah untuk tiap periode.</p></div><span className="metric-icon"><SlidersHorizontal size={15} /></span></div><form onSubmit={saveBudgets} style={{ marginTop: 18 }}><div className="form-grid"><div className="form-field"><label htmlFor="daily-limit">Batas harian (Rp)</label><input id="daily-limit" className="form-input" inputMode="numeric" type="number" min="1" value={dailyValue} onChange={(event) => setDaily(event.target.value)} placeholder={user ? 'Belum diatur' : undefined} required disabled={Boolean(user && (!ready || loadError))} /></div><div className="form-field"><label htmlFor="monthly-limit">Batas bulanan (Rp)</label><input id="monthly-limit" className="form-input" inputMode="numeric" type="number" min="1" value={monthlyValue} onChange={(event) => setMonthly(event.target.value)} placeholder={user ? 'Belum diatur' : undefined} required disabled={Boolean(user && (!ready || loadError))} /></div><div className="form-field"><label htmlFor="yearly-limit">Batas tahunan (Rp)</label><input id="yearly-limit" className="form-input" inputMode="numeric" type="number" min="1" value={yearlyValue} onChange={(event) => setYearly(event.target.value)} placeholder={user ? 'Belum diatur' : undefined} required disabled={Boolean(user && (!ready || loadError))} /></div><div className="form-field"><label htmlFor="threshold">Ambang pengingat (%)</label><select id="threshold" className="form-select" value={user && !ready ? '' : threshold} onChange={(event) => setThreshold(event.target.value)} disabled={Boolean(user && (!ready || loadError))}><option value="" disabled>Memuat…</option><option value="50">50%</option><option value="70">70%</option><option value="80">80%</option><option value="90">90%</option><option value="100">100% (saat batas tercapai)</option></select></div></div><div className="setting-row"><div><strong>Pengingat batas anggaran</strong><span>Ingatkan saat ambang tercapai atau terlewati.</span></div><button className={`toggle${notify ? ' on' : ''}`} type="button" aria-label="Aktifkan pengingat" aria-pressed={notify} onClick={() => setNotify((value) => !value)} disabled={Boolean(user && (!ready || loadError))} /></div>{loadError && <div className="toast" role="alert">{loadError}</div>}{message && <div className="toast" role="status">{message}</div>}<div className="modal-footer"><button className="primary-button" type="submit" disabled={Boolean(user && (!ready || loadError))}><Save size={14} /> Simpan batas</button></div></form></section>
        <aside className="panel"><span className="metric-icon"><BellRing size={16} /></span><h3 className="panel-title" style={{ marginTop: 13 }}>Notifikasi</h3><p className="panel-subtitle" style={{ lineHeight: 1.7 }}>Pengaturan batas dan ambang tersimpan di Supabase. Push ke perangkat memerlukan permission browser, service worker, dan kunci VAPID yang belum dikonfigurasi.</p><div className="setting-row"><div><strong>Keamanan data</strong><span>Baris data dipisahkan per akun dengan RLS.</span></div><ShieldCheck size={18} color="#21845d" /></div><span className="status-pill">{user ? 'Akun aktif' : 'Contoh pengaturan'}</span></aside>
      </div>
    </div>
  );
}
