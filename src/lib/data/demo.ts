export type TransactionKind = 'income' | 'expense';

export type MoneyTransaction = {
  id: string;
  kind: TransactionKind;
  amount: number;
  category: string;
  title: string;
  merchant?: string | null;
  note?: string | null;
  occurred_at: string;
  source?: 'manual' | 'receipt' | 'import';
};

export const demoTransactions: MoneyTransaction[] = [
  { id: 'demo-1', kind: 'expense', amount: 186000, category: 'Makanan', title: 'Makan siang', merchant: 'Kopi Tepi Jalan', occurred_at: '2026-10-16T12:30:00+07:00' },
  { id: 'demo-2', kind: 'income', amount: 1250000, category: 'Freelance', title: 'Proyek desain', merchant: 'Studio Kecil', occurred_at: '2026-10-15T16:12:00+07:00' },
  { id: 'demo-3', kind: 'expense', amount: 42500, category: 'Transportasi', title: 'Perjalanan pulang', merchant: 'RideNow', occurred_at: '2026-10-15T09:40:00+07:00' },
  { id: 'demo-4', kind: 'expense', amount: 238000, category: 'Belanja', title: 'Belanja kebutuhan rumah', merchant: 'Pasar Modern', occurred_at: '2026-10-14T18:05:00+07:00' },
  { id: 'demo-5', kind: 'income', amount: 7500000, category: 'Gaji', title: 'Gaji bulanan', merchant: 'Kantor', occurred_at: '2026-10-01T08:00:00+07:00' },
  { id: 'demo-6', kind: 'expense', amount: 325000, category: 'Tagihan', title: 'Internet rumah', merchant: 'FiberNet', occurred_at: '2026-10-02T07:30:00+07:00' },
  { id: 'demo-7', kind: 'expense', amount: 1250000, category: 'Belanja', title: 'Belanja bulanan', merchant: 'Supermarket', occurred_at: '2026-10-06T11:20:00+07:00' },
  { id: 'demo-8', kind: 'expense', amount: 1378500, category: 'Tagihan', title: 'Sewa tempat tinggal', merchant: 'Pemilik kontrakan', occurred_at: '2026-10-03T07:30:00+07:00' },
];

export const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);

export const formatCompactRupiah = (amount: number) => {
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return formatRupiah(amount);
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
