'use client';

import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import type { MoneyTransaction } from '@/lib/data/demo';

type Props = {
  initial?: MoneyTransaction;
  onClose: () => void;
  onSave: (data: Omit<MoneyTransaction, 'id'>, id?: string) => Promise<boolean>;
};

const categoryOptions = ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Kesehatan', 'Hiburan', 'Gaji', 'Freelance', 'Lainnya'];

export function TransactionForm({ initial, onClose, onSave }: Props) {
  const [kind, setKind] = useState<'income' | 'expense'>(initial?.kind ?? 'expense');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [category, setCategory] = useState(initial?.category ?? 'Makanan');
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.occurred_at.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const parsedAmount = Number(amount.replace(/[^0-9]/g, ''));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Masukkan nominal lebih besar dari nol.');
      setSaving(false);
      return;
    }
    const ok = await onSave({
      kind,
      title: title.trim(),
      amount: parsedAmount,
      category,
      merchant: merchant.trim() || null,
      note: note.trim() || null,
      occurred_at: new Date(`${date}T12:00:00`).toISOString(),
      source: initial?.source ?? 'manual',
    }, initial?.id);
    if (!ok) setError('Transaksi belum tersimpan. Periksa koneksi dan konfigurasi.');
    setSaving(false);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="transaction-form-title">
        <div className="modal-header"><div><h2 id="transaction-form-title">{initial ? 'Tinjau transaksi' : 'Transaksi baru'}</h2><p className="panel-subtitle">Periksa rincian sebelum menyimpan.</p></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={16} /></button></div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-field full"><label>Jenis transaksi</label><div className="page-actions"><button type="button" className={kind === 'expense' ? 'primary-button' : 'secondary-button'} onClick={() => setKind('expense')}>Pengeluaran</button><button type="button" className={kind === 'income' ? 'primary-button' : 'secondary-button'} onClick={() => setKind('income')}>Pemasukan</button></div></div>
            <div className="form-field full"><label htmlFor="transaction-title">Nama transaksi</label><input id="transaction-title" className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Belanja mingguan" maxLength={160} required /></div>
            <div className="form-field"><label htmlFor="transaction-amount">Nominal (Rp)</label><input id="transaction-amount" className="form-input" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="150000" required /></div>
            <div className="form-field"><label htmlFor="transaction-category">Kategori</label><select id="transaction-category" className="form-select" value={category} onChange={(event) => setCategory(event.target.value)}>{initial?.category && !categoryOptions.includes(initial.category) && <option value={initial.category}>{initial.category}</option>}{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="form-field"><label htmlFor="transaction-merchant">Toko / sumber</label><input id="transaction-merchant" className="form-input" value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="Opsional" maxLength={160} /></div>
            <div className="form-field"><label htmlFor="transaction-date">Tanggal</label><input id="transaction-date" type="date" className="form-input" value={date} onChange={(event) => setDate(event.target.value)} required /></div>
            <div className="form-field full"><label htmlFor="transaction-note">Catatan</label><textarea id="transaction-note" className="form-textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opsional" maxLength={1000} /></div>
          </div>
          {error && <div className="toast" role="alert">{error}</div>}
          <div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Batal</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan transaksi'}</button></div>
        </form>
      </section>
    </div>
  );
}
