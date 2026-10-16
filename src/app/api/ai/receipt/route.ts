import { NextResponse } from 'next/server';
import { authorizeSupabaseRequest } from '@/lib/supabase/authorize-request';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

type ReceiptBody = { imageBase64?: unknown; mimeType?: unknown };

export async function POST(request: Request) {
  const user = await authorizeSupabaseRequest(request);
  if (!user) return NextResponse.json({ error: 'Masuk ke DanaKu untuk memproses struk.' }, { status: 401 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Gemini belum aktif. Simpan GEMINI_API_KEY sebagai secret server.' }, { status: 503 });

  let body: ReceiptBody;
  try { body = await request.json() as ReceiptBody; }
  catch { return NextResponse.json({ error: 'Format permintaan tidak valid.' }, { status: 400 }); }
  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';
  if (!ALLOWED_MIME.has(mimeType)) return NextResponse.json({ error: 'Tipe file harus JPG, PNG, atau WebP.' }, { status: 415 });
  if (!imageBase64 || imageBase64.length > 8_400_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return NextResponse.json({ error: 'Gambar kosong, tidak valid, atau lebih besar dari 6 MB.' }, { status: 413 });
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [
        { text: 'Baca struk transaksi pada gambar. Kembalikan satu objek JSON valid tanpa markdown dengan schema: {"merchant": string|null, "date": string|null (ISO YYYY-MM-DD), "total": number|null, "currency": string, "category": string, "items": [{"name": string, "amount": number|null}], "confidence": number}. Jangan menebak informasi yang tidak terbaca; gunakan null. Total harus angka tanpa pemisah. Gunakan IDR bila simbol atau konteks menunjukkan rupiah.' },
        { inlineData: { mimeType, data: imageBase64 } },
      ] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 1000 },
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    return NextResponse.json({ error: status === 429 ? 'Batas penggunaan AI tercapai. Coba lagi nanti.' : 'Gemini belum dapat membaca gambar ini.' }, { status });
  }
  const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const output = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
  if (!output) return NextResponse.json({ error: 'Gemini tidak mengembalikan data struk.' }, { status: 502 });
  try {
    const parsed = JSON.parse(output) as Record<string, unknown>;
    const total = typeof parsed.total === 'number' && Number.isFinite(parsed.total) && parsed.total >= 0 ? parsed.total : null;
    return NextResponse.json({
      merchant: typeof parsed.merchant === 'string' ? parsed.merchant.slice(0, 160) : null,
      date: typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
      total,
      currency: typeof parsed.currency === 'string' ? parsed.currency.slice(0, 3) : 'IDR',
      category: typeof parsed.category === 'string' ? parsed.category.slice(0, 60) : 'Lainnya',
      items: Array.isArray(parsed.items) ? parsed.items.slice(0, 30) : [],
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : null,
      model: MODEL,
    });
  } catch {
    return NextResponse.json({ error: 'Format hasil pembacaan struk tidak dapat dipahami. Coba gambar yang lebih jelas.' }, { status: 502 });
  }
}
