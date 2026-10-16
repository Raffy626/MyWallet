import { NextResponse } from 'next/server';
import { authorizeSupabaseRequest } from '@/lib/supabase/authorize-request';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const MAX_MESSAGE_LENGTH = 4000;

type ChatBody = { message?: unknown; history?: unknown };

export async function POST(request: Request) {
  const user = await authorizeSupabaseRequest(request);
  if (!user) return NextResponse.json({ error: 'Masuk ke DanaKu untuk menggunakan AI.' }, { status: 401 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Gemini belum aktif. GEMINI_API_KEY harus disimpan di secret server.' }, { status: 503 });

  let body: ChatBody;
  try { body = await request.json() as ChatBody; }
  catch { return NextResponse.json({ error: 'Format permintaan tidak valid.' }, { status: 400 }); }
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ error: `Pesan harus berisi 1–${MAX_MESSAGE_LENGTH} karakter.` }, { status: 400 });

  const history = Array.isArray(body.history)
    ? body.history.slice(-10).flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        const row = entry as { role?: unknown; text?: unknown };
        if ((row.role !== 'user' && row.role !== 'model') || typeof row.text !== 'string') return [];
        return [{ role: row.role, parts: [{ text: row.text.slice(0, 2000) }] }];
      })
    : [];

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'Kamu adalah DanaKu AI, asisten pencatatan keuangan pribadi yang ramah dan tidak menghakimi. Beri saran edukatif yang ringkas berdasarkan informasi yang benar-benar disampaikan pengguna. Jangan mengarang saldo, transaksi, atau isi database yang tidak diberikan dalam pesan. Untuk investasi, pajak, atau keputusan berisiko tinggi, jelaskan bahwa jawabanmu bukan nasihat profesional.' }] },
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      generationConfig: { temperature: 0.35, maxOutputTokens: 700 },
    }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    return NextResponse.json({ error: status === 429 ? 'Batas penggunaan AI tercapai. Coba lagi nanti.' : 'Gemini belum dapat memproses pesan ini.' }, { status });
  }
  const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
  if (!text) return NextResponse.json({ error: 'Gemini tidak mengembalikan jawaban teks.' }, { status: 502 });
  return NextResponse.json({ text, model: MODEL });
}
