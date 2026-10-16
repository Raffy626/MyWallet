'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, FileImage, Paperclip, Send, Sparkles, UploadCloud } from 'lucide-react';
import { DemoBanner } from '@/components/demo-banner';
import { TransactionForm } from '@/components/transaction-form';
import { useAuth } from '@/components/auth-provider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatRupiah, type MoneyTransaction } from '@/lib/data/demo';

type ChatLine = { role: 'user' | 'assistant'; text: string };
type ReceiptResult = { merchant?: string | null; date?: string | null; total?: number | null; currency?: string; category?: string; items?: Array<{ name: string; amount?: number | null }>; confidence?: number };

async function fileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File tidak dapat dibaca.'));
    reader.onload = () => {
      const value = String(reader.result ?? '');
      resolve(value.slice(value.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [receipt, setReceipt] = useState<ReceiptResult | null>(null);
  const [receiptDraft, setReceiptDraft] = useState<MoneyTransaction | null>(null);
  const [reviewReceipt, setReviewReceipt] = useState(false);
  const [receiptName, setReceiptName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;
    void supabase.from('ai_threads').select('id').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error) { setNotice('Riwayat AI belum dapat dimuat. Pastikan migrasi Supabase telah diterapkan.'); return; }
        if (!data) return;
        setThreadId(data.id);
        const { data: messages, error: messageError } = await supabase.from('ai_messages').select('role,content').eq('thread_id', data.id).eq('user_id', user.id).order('created_at', { ascending: true }).limit(100);
        if (!active) return;
        if (messageError) { setNotice('Pesan lama belum dapat dimuat.'); return; }
        setLines((messages ?? []).map((row) => ({ role: row.role === 'assistant' ? 'assistant' : 'user', text: row.content })));
      });
    return () => { active = false; };
  }, [user]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    if (!user) { setNotice('Masuk dengan akun Supabase untuk menggunakan Gemini.'); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setNotice('Supabase belum dikonfigurasi.'); return; }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setNotice('Sesi tidak ditemukan. Silakan masuk kembali.'); return; }
    const previous = lines;
    setLines((current) => [...current, { role: 'user', text }]);
    setMessage('');
    setBusy(true);
    setNotice('');
    try {
      let activeThread = threadId;
      if (!activeThread) {
        const { data: thread, error } = await supabase.from('ai_threads').insert({ user_id: user.id, title: text.slice(0, 120) }).select('id').single();
        if (error || !thread) throw new Error('Percakapan belum dapat dibuat. Pastikan schema Supabase telah diterapkan.');
        activeThread = thread.id;
        setThreadId(activeThread);
      }
      const { error: saveUserError } = await supabase.from('ai_messages').insert({ thread_id: activeThread, user_id: user.id, role: 'user', content: text });
      if (saveUserError) throw new Error('Pesan belum tersimpan. Periksa kebijakan database.');
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history: previous.map((line) => ({ role: line.role === 'assistant' ? 'model' : 'user', text: line.text })) }),
      });
      const result = await response.json() as { text?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'AI belum dapat menjawab.');
      const answer = result.text ?? 'Belum ada jawaban.';
      setLines((current) => [...current, { role: 'assistant', text: answer }]);
      const { error: saveAnswerError } = await supabase.from('ai_messages').insert({ thread_id: activeThread, user_id: user.id, role: 'assistant', content: answer });
      if (!saveAnswerError) await supabase.from('ai_threads').update({ updated_at: new Date().toISOString() }).eq('id', activeThread).eq('user_id', user.id);
      else setNotice('Jawaban tampil, tetapi belum tersimpan ke riwayat.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Koneksi ke AI terputus.');
      setLines((current) => [...current, { role: 'assistant', text: 'Saya belum dapat memproses pesan ini. Periksa konfigurasi Supabase dan Gemini, lalu coba lagi.' }]);
    } finally { setBusy(false); }
  }

  async function uploadReceipt(file?: File) {
    if (!file) return;
    setReceipt(null);
    setReceiptDraft(null);
    setReceiptName(file.name);
    setNotice('');
    if (!user) { setNotice('Masuk terlebih dahulu untuk memproses struk.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setNotice('Gunakan file JPG, PNG, atau WebP.'); return; }
    if (file.size > 6 * 1024 * 1024) { setNotice('Ukuran struk maksimal 6 MB.'); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setNotice('Supabase belum dikonfigurasi.'); return; }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setNotice('Sesi tidak ditemukan. Silakan masuk kembali.'); return; }
    setBusy(true);
    setNotice('Gemini sedang membaca struk…');
    try {
      const imageBase64 = await fileAsBase64(file);
      const response = await fetch('/api/ai/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64, mimeType: file.type }),
      });
      const result = await response.json() as ReceiptResult & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Struk belum dapat dibaca.');
      setReceipt(result);
      const fallbackDate = new Date();
      const receiptDate = result.date ? new Date(`${result.date}T12:00:00+07:00`) : fallbackDate;
      const merchant = result.merchant?.trim() || '';
      const itemNote = result.items?.map((item) => item.name).filter(Boolean).join(', ') || '';
      setReceiptDraft({
        id: 'receipt-draft',
        kind: 'expense',
        amount: Math.round(result.total ?? 0),
        category: result.category?.trim() || 'Lainnya',
        title: merchant ? `Pembelian di ${merchant}` : 'Transaksi dari struk',
        merchant: merchant || null,
        note: itemNote || null,
        occurred_at: receiptDate.toISOString(),
        source: 'receipt',
      });
      setNotice('Periksa dan koreksi hasil ekstraksi sebelum menyimpan sebagai transaksi.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Struk belum dapat dibaca.');
    } finally { setBusy(false); }
  }

  async function saveReceiptTransaction(input: Omit<MoneyTransaction, 'id'>) {
    if (!user) return false;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return false;
    const { error } = await supabase.from('transactions').insert({ ...input, user_id: user.id }).select('id').single();
    if (error) { setNotice(`Transaksi belum tersimpan: ${error.message}`); return false; }
    setReceipt(null);
    setReceiptDraft(null);
    setReviewReceipt(false);
    setNotice('Transaksi dari struk berhasil disimpan.');
    return true;
  }

  return (
    <div className="page-content">
      {!user && <DemoBanner />}
      <div className="dashboard-intro"><div><h2>Asisten keuanganmu</h2><p>Diskusikan pencatatan atau unggah struk untuk mengambil rinciannya.</p></div><span className="status-pill">Gemini 3.6 Flash</span></div>
      <div className="ai-layout">
        <section className="panel ai-chat">
          <div className="panel-header"><div><h3 className="panel-title">Percakapan DanaKu AI</h3><p className="panel-subtitle">Jawaban edukatif, bukan nasihat keuangan profesional.</p></div><span className="metric-icon"><Sparkles size={16} /></span></div>
          <div className="ai-chat-body">
            {lines.length === 0 ? <div className="ai-welcome"><span className="ai-spark"><Bot size={20} /></span><h2>Ada yang ingin kamu pahami?</h2><p>Tanyakan cara membaca kebiasaan belanja, merencanakan anggaran, atau mencatat transaksi. Riwayat percakapan tersimpan privat pada akunmu.</p><div className="page-actions" style={{ justifyContent: 'center', flexWrap: 'wrap' }}><button className="secondary-button" onClick={() => setMessage('Bagaimana cara menjaga anggaran belanja bulanan?')}>Tips anggaran</button><button className="secondary-button" onClick={() => setMessage('Bantu saya merangkum pola pengeluaran.')}>Pola pengeluaran</button></div></div> : lines.map((line, index) => <div key={`${line.role}-${index}`} className={`chat-bubble${line.role === 'user' ? ' user' : ''}`}>{line.text}</div>)}
            {busy && <div className="chat-bubble">Sedang menyiapkan jawaban…</div>}
          </div>
          <form className="chat-composer" onSubmit={send}><button type="button" className="icon-button" aria-label="Unggah struk" onClick={() => fileInput.current?.click()}><Paperclip size={15} /></button><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tulis pertanyaan tentang keuanganmu…" aria-label="Pesan untuk AI" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} /><button className="primary-button" type="submit" aria-label="Kirim pesan" disabled={busy || !message.trim()}><Send size={15} /></button></form>
          {notice && <div className="toast" role="status">{notice}</div>}
        </section>
        <aside className="chat-side">
          <section className="panel"><div className="panel-header"><div><h3 className="panel-title">Baca struk</h3><p className="panel-subtitle">Unggah gambar untuk menyiapkan draft transaksi.</p></div><span className="metric-icon"><FileImage size={15} /></span></div><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => void uploadReceipt(event.target.files?.[0])} /><button className="upload-drop" onClick={() => fileInput.current?.click()} disabled={busy}><UploadCloud size={21} color="#3b8e68" /><strong>{busy && receiptName ? 'Sedang diproses…' : 'Pilih foto struk'}</strong><span>JPG, PNG, WebP · maksimal 6 MB</span></button>
            {receipt && <div className="panel" style={{ marginTop: 13, padding: 12, background: '#f8fbf8', boxShadow: 'none' }}><strong style={{ fontSize: 11 }}>Draft hasil ekstraksi</strong><p className="panel-subtitle" style={{ lineHeight: 1.6 }}>Toko: {receipt.merchant || 'Belum terdeteksi'}<br />Tanggal: {receipt.date || 'Belum terdeteksi'}<br />Total: {typeof receipt.total === 'number' ? formatRupiah(receipt.total) : 'Perlu ditinjau'}<br />Kategori: {receipt.category || 'Lainnya'}</p><span className="status-pill">Belum disimpan</span><button className="primary-button" style={{ width: '100%', marginTop: 10 }} onClick={() => setReviewReceipt(true)} disabled={!receiptDraft}>Tinjau &amp; buat transaksi</button></div>}
          </section>
          <section className="panel"><h3 className="panel-title">Cara kerja AI</h3><p className="ai-model-note" style={{ marginTop: 9 }}>Model yang dipilih: <strong>Gemini 3.6 Flash</strong>. Hasil ekstraksi dapat keliru, jadi periksa nominal dan tanggal sebelum transaksi disimpan.</p><p className="ai-model-note">Kunci Gemini hanya dipakai di server. Foto diproses untuk ekstraksi dan tidak otomatis disimpan di bucket.</p></section>
        </aside>
      </div>
      {reviewReceipt && receiptDraft && <TransactionForm initial={receiptDraft} onClose={() => setReviewReceipt(false)} onSave={saveReceiptTransaction} />}
    </div>
  );
}
