'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { TransactionForm } from '@/components/transaction-form';
import { useAuth } from '@/components/auth-provider';
import { DemoBanner } from '@/components/demo-banner';
import { demoTransactions, formatDate, formatRupiah, type MoneyTransaction } from '@/lib/data/demo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MoneyTransaction[]>(demoTransactions);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<MoneyTransaction | null | 'new'>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.from('transactions').select('id,kind,amount,category,title,merchant,note,occurred_at,source').order('occurred_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setMessage('Tidak dapat memuat transaksi. Terapkan migrasi Supabase terlebih dahulu.');
        else setRows((data ?? []) as MoneyTransaction[]);
      });
  }, [user]);

  const filtered = useMemo(() => rows.filter((row) => `${row.title} ${row.merchant ?? ''} ${row.category}`.toLowerCase().includes(search.toLowerCase())), [rows, search]);

  async function save(input: Omit<MoneyTransaction, 'id'>, id?: string) {
    if (user) {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return false;
      const payload = { ...input, amount: Number(input.amount) };
      const result = id
        ? await supabase.from('transactions').update(payload).eq('id', id).select().single()
        : await supabase.from('transactions').insert({ ...payload, user_id: user.id }).select().single();
      if (result.error) { setMessage(result.error.message); return false; }
      setRows((current) => id ? current.map((row) => row.id === id ? result.data as MoneyTransaction : row) : [result.data as MoneyTransaction, ...current]);
      setMessage('Perubahan transaksi tersimpan.');
    } else {
      setRows((current) => id
        ? current.map((row) => row.id === id ? { ...input, id } : row)
        : [{ ...input, id: `demo-${Date.now()}` }, ...current]);
      setMessage('Data pratinjau berubah sementara dan tidak tersimpan ke akun.');
    }
    setEditor(null);
    return true;
  }

  async function remove(row: MoneyTransaction) {
    if (!window.confirm(`Hapus transaksi “${row.title}”?`)) return;
    if (user) {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { error } = await supabase.from('transactions').delete().eq('id', row.id);
      if (error) { setMessage(`Belum terhapus: ${error.message}`); return; }
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    setMessage(user ? 'Transaksi dihapus.' : 'Transaksi demo dihapus dari tampilan sementara.');
  }

  return (
    <div className="page-content">
      {!user && <DemoBanner />}
      <div className="dashboard-intro"><div><h2>Riwayat transaksi</h2><p>Catat pemasukan dan pengeluaran tanpa kehilangan konteks.</p></div><button className="primary-button" onClick={() => setEditor('new')}><Plus size={15} /> Tambah transaksi</button></div>
      <section className="panel table-panel">
        <div className="table-toolbar"><div><h3 className="panel-title">Semua transaksi</h3><p className="panel-subtitle">{filtered.length} catatan ditemukan</p></div><label className="search-field"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari transaksi" aria-label="Cari transaksi" /></label></div>
        {message && <div className="toast" role="status" style={{ margin: 12 }}>{message}</div>}
        {filtered.length ? <div className="table-wrap"><table><thead><tr><th>TRANSAKSI</th><th>JENIS</th><th>KATEGORI</th><th>TANGGAL</th><th>JUMLAH</th><th>AKSI</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><span className="transaction-title"><span className="transaction-mark">{row.kind === 'income' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}</span><span>{row.title}<small style={{ display: 'block', marginTop: 3, color: '#89968e', fontWeight: 400 }}>{row.merchant || 'Catatan manual'}</small></span></span></td><td>{row.kind === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td><td><span className="status-pill">{row.category}</span></td><td>{formatDate(row.occurred_at)}</td><td className={row.kind === 'income' ? 'amount-income' : 'amount-expense'}>{row.kind === 'income' ? '+' : '−'}{formatRupiah(Number(row.amount))}</td><td><div className="page-actions"><button className="icon-button" aria-label={`Ubah ${row.title}`} onClick={() => setEditor(row)}><Pencil size={14} /></button><button className="icon-button" aria-label={`Hapus ${row.title}`} onClick={() => void remove(row)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div> : <div className="empty-state">Tidak ada transaksi yang cocok dengan pencarianmu.</div>}
      </section>
      {editor && <TransactionForm initial={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} onSave={save} />}
    </div>
  );
}
