'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowRight, Banknote, CalendarDays, CirclePlus,
  CreditCard, Ellipsis, ShoppingBag, Sparkles, Wallet,
} from 'lucide-react';
import { DemoBanner } from '@/components/demo-banner';
import { TransactionForm } from '@/components/transaction-form';
import { useAuth } from '@/components/auth-provider';
import { demoTransactions, formatCompactRupiah, formatDate, formatRupiah, type MoneyTransaction } from '@/lib/data/demo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function CashflowChart({ transactions }: { transactions: MoneyTransaction[] }) {
  const grouped = new Map<string, { income: number; expense: number }>();
  for (const transaction of transactions) {
    const day = new Date(transaction.occurred_at).toLocaleDateString('sv-SE');
    const current = grouped.get(day) ?? { income: 0, expense: 0 };
    current[transaction.kind] += Number(transaction.amount);
    grouped.set(day, current);
  }
  const days = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8);
  if (!days.length) return <div className="empty-state">Belum ada transaksi pada periode ini untuk digambarkan.</div>;
  const maxValue = Math.max(1, ...days.flatMap(([, row]) => [row.income, row.expense]));
  const point = (index: number, amount: number) => {
    const x = days.length === 1 ? 367 : 42 + (index * 650) / (days.length - 1);
    const y = 158 - (amount / maxValue) * 116;
    return `${x},${y}`;
  };
  const incomePoints = days.map(([, row], index) => point(index, row.income)).join(' ');
  const expensePoints = days.map(([, row], index) => point(index, row.expense)).join(' ');
  const incomeArea = `M${incomePoints.replaceAll(' ', ' L')} L692 158 L42 158 Z`;
  return (
    <div className="chart-wrap" role="img" aria-label="Grafik pemasukan dan pengeluaran bulan berjalan">
      <svg viewBox="0 0 700 205" preserveAspectRatio="none">
        <defs><linearGradient id="cash-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#63d09c" stopOpacity=".22" /><stop offset="100%" stopColor="#63d09c" stopOpacity="0" /></linearGradient></defs>
        {[27, 70, 113, 156].map((y) => <line key={y} x1="42" x2="692" y1={y} y2={y} className="chart-grid-line" />)}
        <text x="0" y="30" className="chart-label">{formatCompactRupiah(maxValue)}</text><text x="0" y="73" className="chart-label">{formatCompactRupiah(maxValue * .66)}</text><text x="0" y="116" className="chart-label">{formatCompactRupiah(maxValue * .33)}</text><text x="0" y="159" className="chart-label">Rp 0</text>
        <path className="chart-area" d={incomeArea} />
        <polyline className="chart-income" points={incomePoints} />
        <polyline className="chart-expense" points={expensePoints} />
        {days.map(([day], index) => <text key={day} x={days.length === 1 ? 367 : 42 + (index * 650) / (days.length - 1)} y="190" textAnchor="middle" className="chart-label">{new Date(`${day}T12:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</text>)}
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const { user, configured } = useAuth();
  const [liveRecent, setLiveRecent] = useState<MoneyTransaction[]>([]);
  const [liveMonth, setLiveMonth] = useState<MoneyTransaction[]>([]);
  const [liveBudgetLimit, setLiveBudgetLimit] = useState<number | null>(null);
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [demoRows, setDemoRows] = useState<MoneyTransaction[]>(demoTransactions);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const liveUser = Boolean(user && configured);
  const dataReady = !liveUser || loadedForUser === user?.id;
  const monthlyTransactions = liveUser ? liveMonth : demoRows;
  const recentTransactions = liveUser ? liveRecent : demoRows;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDateLabel(new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const currentUser = user;
    if (!liveUser || !currentUser) return;
    const currentUserId = currentUser.id;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    let active = true;
    async function loadDashboard(supabase: NonNullable<typeof client>) {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthStart = firstOfMonth.toISOString();
      const monthEnd = nextMonth.toISOString();
      const startsOn = firstOfMonth.toISOString().slice(0, 10);
      const [recentResult, monthResult, budgetResult] = await Promise.all([
        supabase.from('transactions').select('id,kind,amount,category,title,merchant,note,occurred_at,source').eq('user_id', currentUserId).order('occurred_at', { ascending: false }).limit(8),
        supabase.from('transactions').select('id,kind,amount,category,title,merchant,note,occurred_at,source').eq('user_id', currentUserId).gte('occurred_at', monthStart).lt('occurred_at', monthEnd).order('occurred_at', { ascending: true }).limit(1000),
        supabase.from('budgets').select('limit_amount').eq('user_id', currentUserId).eq('period', 'monthly').eq('starts_on', startsOn).maybeSingle(),
      ]);
      if (!active) return;
      if (recentResult.error || monthResult.error || budgetResult.error) {
        setNotice('Data akun belum dapat dimuat. Periksa migrasi dan kebijakan Supabase.');
        setLiveRecent([]);
        setLiveMonth([]);
        setLiveBudgetLimit(null);
      } else {
        setLiveRecent((recentResult.data ?? []) as MoneyTransaction[]);
        setLiveMonth((monthResult.data ?? []) as MoneyTransaction[]);
        setLiveBudgetLimit(budgetResult.data ? Number(budgetResult.data.limit_amount) : null);
      }
      setLoadedForUser(currentUserId);
    }
    void loadDashboard(client);
    return () => { active = false; };
  }, [liveUser, user, refreshToken]);

  const totals = useMemo(() => monthlyTransactions.reduce((result, transaction) => {
    result[transaction.kind] += Number(transaction.amount);
    return result;
  }, { income: 0, expense: 0 }), [monthlyTransactions]);
  const budgetLimit = liveUser ? liveBudgetLimit : 5500000;
  const spentPercent = budgetLimit ? Math.round((totals.expense / budgetLimit) * 100) : null;
  const categorySpend = useMemo(() => {
    const categories = new Map<string, { amount: number; count: number }>();
    monthlyTransactions.filter((transaction) => transaction.kind === 'expense').forEach((transaction) => {
      const row = categories.get(transaction.category) ?? { amount: 0, count: 0 };
      row.amount += Number(transaction.amount);
      row.count += 1;
      categories.set(transaction.category, row);
    });
    const top = [...categories.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 3);
    const max = Math.max(1, ...top.map(([, row]) => row.amount));
    return top.map(([name, row]) => ({ name, ...row, width: `${Math.round((row.amount / max) * 100)}%` }));
  }, [monthlyTransactions]);

  async function saveTransaction(input: Omit<MoneyTransaction, 'id'>, id?: string) {
    if (user) {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return false;
      const payload = { kind: input.kind, amount: input.amount, category: input.category, title: input.title, merchant: input.merchant ?? null, note: input.note ?? null, occurred_at: input.occurred_at, source: input.source ?? 'manual' };
      const result = id
        ? await supabase.from('transactions').update(payload).eq('id', id).select().single()
        : await supabase.from('transactions').insert({ ...payload, user_id: user.id }).select().single();
      if (result.error) { setNotice(`Belum tersimpan: ${result.error.message}`); return false; }
      setNotice('Transaksi tersimpan.');
      setRefreshToken((value) => value + 1);
    } else {
      setDemoRows((current) => id
        ? current.map((item) => item.id === id ? { ...input, id } : item)
        : [{ ...input, id: `demo-${Date.now()}` }, ...current]);
      setNotice('Perubahan ini hanya tersimpan sementara dalam pratinjau.');
    }
    setShowForm(false);
    return true;
  }

  const balance = totals.income - totals.expense;

  return (
    <div className="page-content">
      {!liveUser && <DemoBanner />}
      {notice && <div className="toast" role="status" style={{ marginBottom: 14 }}>{notice}</div>}
      <div className="dashboard-intro">
        <div><h2>Ringkasan keuangan</h2><p>{dateLabel} · Satu langkah kecil menuju keuangan lebih teratur.</p></div>
        <button className="primary-button" onClick={() => setShowForm(true)}><CirclePlus size={15} /> Tambah transaksi</button>
      </div>

      <section className="metric-grid" aria-label="Ringkasan bulan berjalan">
        <article className="metric-card"><div className="metric-top"><span>Total pemasukan bulan ini</span><span className="metric-icon"><ArrowDownRight size={16} /></span></div><div className="metric-value">{!dataReady ? 'Memuat…' : formatRupiah(totals.income)}</div><div className="metric-foot"><span>{liveUser ? 'Agregat transaksi Supabase' : 'Data contoh'}</span></div></article>
        <article className="metric-card"><div className="metric-top"><span>Total pengeluaran bulan ini</span><span className="metric-icon" style={{ color: '#bb7951', background: '#fff4e8' }}><CreditCard size={16} /></span></div><div className="metric-value">{!dataReady ? 'Memuat…' : formatRupiah(totals.expense)}</div><div className="metric-foot"><span>{liveUser ? 'Agregat transaksi Supabase' : 'Data contoh'}</span></div></article>
        <article className="metric-card"><div className="metric-top"><span>Sisa anggaran bulanan</span><span className="metric-icon"><Wallet size={16} /></span></div><div className="metric-value">{!dataReady ? 'Memuat…' : budgetLimit ? formatRupiah(budgetLimit - totals.expense) : 'Belum diatur'}</div><div className="metric-foot"><span>{spentPercent === null ? 'Tambahkan batas di Pengaturan' : `${spentPercent}% dari batas terpakai`}</span></div></article>
        <article className="metric-card"><div className="metric-top"><span>Transaksi bulan ini</span><span className="metric-icon" style={{ color: '#6b83b5', background: '#eff3fc' }}><Banknote size={16} /></span></div><div className="metric-value">{!dataReady ? '…' : monthlyTransactions.length} <span style={{ fontSize: 12, color: '#87938c', fontWeight: 500 }}>transaksi</span></div><div className="metric-foot"><CalendarDays size={12} /><span>{liveUser ? 'Dihitung untuk bulan berjalan' : 'Contoh bulan berjalan'}</span></div></article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-header"><div><h3 className="panel-title">Arus kas</h3><p className="panel-subtitle">Pemasukan dan pengeluaran bulan berjalan</p></div><button className="icon-button" aria-label="Opsi grafik"><Ellipsis size={17} /></button></div>
          <div className="cash-summary"><strong>{!dataReady ? 'Memuat…' : formatRupiah(balance)}</strong><span>{liveUser ? 'Saldo bersih bulan ini' : 'Saldo bersih · data contoh'}</span></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }} className="chart-legend"><span className="legend-key"><i className="legend-dot" /> Pemasukan</span><span className="legend-key"><i className="legend-dot muted" /> Pengeluaran</span></div>
          {dataReady && <CashflowChart transactions={monthlyTransactions} />}
        </article>
        <article className="panel">
          <div className="panel-header"><div><h3 className="panel-title">Batas bulanan</h3><p className="panel-subtitle">Pemakaian anggaran bulan ini</p></div><Link className="icon-button" href="/settings" aria-label="Atur batas"><Wallet size={15} /></Link></div>
          <div className="budget-total"><strong>{!dataReady ? 'Memuat…' : formatRupiah(totals.expense)}</strong><span>{budgetLimit ? `dari ${formatRupiah(budgetLimit)}` : 'batas belum diatur'}</span></div>
          {budgetLimit && <><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, spentPercent ?? 0)}%` }} /></div><div className="progress-caption"><span>{spentPercent}% sudah digunakan</span><span>{formatRupiah(Math.max(0, budgetLimit - totals.expense))} tersisa</span></div></>}
          <div className="category-list">{categorySpend.length ? categorySpend.map(({ name, count, amount, width }) => {
            const Icon = /transport/i.test(name) ? CreditCard : /tagihan|bill/i.test(name) ? Banknote : ShoppingBag;
            return <div key={name} className="category-row"><span className="category-icon"><Icon size={15} /></span><div><div className="category-name">{name}</div><div className="category-meta">{count} transaksi<div className="progress-track" style={{ height: 4, marginTop: 5 }}><div className="progress-fill" style={{ width, background: '#9bcdae' }} /></div></div></div><span className="category-amount">{formatRupiah(amount)}</span></div>;
          }) : <div className="empty-state">Belum ada pengeluaran tercatat bulan ini.</div>}</div>
        </article>
      </section>

      <section className="panel table-panel">
        <div className="table-toolbar"><div><h3 className="panel-title">Transaksi terbaru</h3><p className="panel-subtitle">Aktivitas keuangan yang paling baru</p></div><div className="page-actions"><Link className="ghost-button" href="/transactions">Lihat semua <ArrowRight size={14} /></Link></div></div>
        {recentTransactions.length ? <div className="table-wrap"><table><thead><tr><th>TRANSAKSI</th><th>KATEGORI</th><th>TANGGAL</th><th>JUMLAH</th></tr></thead><tbody>{recentTransactions.slice(0, 5).map((transaction) => <tr key={transaction.id}><td><span className="transaction-title"><span className="transaction-mark"><ShoppingBag size={14} /></span><span>{transaction.title}<small style={{ display: 'block', marginTop: 3, color: '#89968e', fontWeight: 400 }}>{transaction.merchant || 'Catatan manual'}</small></span></span></td><td><span className="status-pill">{transaction.category}</span></td><td>{formatDate(transaction.occurred_at)}</td><td className={transaction.kind === 'income' ? 'amount-income' : 'amount-expense'}>{transaction.kind === 'income' ? '+' : '−'}{formatRupiah(Number(transaction.amount))}</td></tr>)}</tbody></table></div> : <div className="empty-state">{!dataReady ? 'Memuat transaksi…' : 'Belum ada transaksi. Tambahkan catatan pertamamu.'}</div>}
      </section>
      <Link href="/assistant" className="panel" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, padding: '14px 16px', borderColor: '#dceee3', background: 'linear-gradient(90deg,#f0faf3,#fff)' }}><span className="metric-icon"><Sparkles size={16} /></span><span style={{ flex: 1 }}><strong style={{ display: 'block', fontSize: 11 }}>Butuh ide untuk mengatur uang?</strong><span className="panel-subtitle">Tanyakan ke DanaKu AI, atau unggah struk untuk mulai mencatat.</span></span><ArrowRight size={16} color="#42805f" /></Link>
      {showForm && <TransactionForm onClose={() => setShowForm(false)} onSave={saveTransaction} />}
    </div>
  );
}
