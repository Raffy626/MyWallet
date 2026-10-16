import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/auth-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'DanaKu — Pantau keuanganmu',
    template: '%s · DanaKu',
  },
  description: 'Pantau pemasukan, pengeluaran, dan batas anggaran dalam satu tempat.',
  applicationName: 'DanaKu',
  icons: { icon: '/danaku-mark.svg', apple: '/danaku-mark.svg' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DanaKu',
  },
};

export const viewport: Viewport = {
  themeColor: '#f5f7f5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
