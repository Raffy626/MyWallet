import Link from 'next/link';
import { Info } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="demo-banner" role="status">
      <Info size={15} />
      <span>Mode pratinjau: angka contoh ditampilkan. Hubungkan Supabase untuk akun dan data pribadi.</span>
      <Link href="/login">Lihat autentikasi</Link>
    </div>
  );
}
