'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowUpRight, BarChart3, Bell, Bot, CircleHelp, Coins, CreditCard, LayoutDashboard,
  LogOut, Menu, Search, Settings, UserRound,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

const mainNav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transaksi', icon: CreditCard },
  { href: '/reports', label: 'Laporan', icon: BarChart3 },
  { href: '/assistant', label: 'AI Assistant', icon: Bot, count: 'AI' },
];
const accountNav = [
  { href: '/profile', label: 'Profil', icon: UserRound },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];
const titles: Record<string, [string, string]> = {
  '/': ['Dashboard', 'Ringkasan keuanganmu dalam satu pandangan'],
  '/transactions': ['Transaksi', 'Catat dan kelola pemasukan serta pengeluaran'],
  '/reports': ['Laporan', 'Lihat pola keuangan dari waktu ke waktu'],
  '/assistant': ['AI Assistant', 'Teman diskusi untuk keputusan keuangan sehari-hari'],
  '/profile': ['Profil', 'Kelola informasi akun DanaKu'],
  '/settings': ['Pengaturan', 'Atur preferensi dan batas pemakaian uang'],
};

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="DanaKu, ke dashboard">
      <span className="brand-mark"><Coins size={19} strokeWidth={2.5} /></span>
      <span className="brand-name">DanaKu</span>
    </Link>
  );
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [title, subtitle] = titles[pathname] ?? ['DanaKu', 'Pantau keuanganmu'];
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Pengguna demo';
  const initials = displayName.slice(0, 1).toUpperCase();

  const renderLink = (item: (typeof mainNav)[number] | (typeof accountNav)[number]) => {
    const Icon = item.icon;
    const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
    return (
      <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`nav-link${active ? ' active' : ''}`}>
        <Icon size={16} strokeWidth={1.9} />
        <span>{item.label}</span>
        {'count' in item && <span className="nav-count">{item.count}</span>}
      </Link>
    );
  };

  return (
    <div className="app-frame">
      <button className={`mobile-overlay${mobileOpen ? ' show' : ''}`} onClick={() => setMobileOpen(false)} aria-label="Tutup navigasi" />
      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        <Brand />
        <label className="sidebar-search">
          <Search size={15} />
          <input aria-label="Cari" placeholder="Cari di DanaKu" />
          <span style={{ fontSize: 9, opacity: .7 }}>⌘ K</span>
        </label>
        <div className="nav-section">Menu utama</div>
        <nav className="nav-list" aria-label="Menu utama">{mainNav.map(renderLink)}</nav>
        <div className="nav-section">Akun</div>
        <nav className="nav-list" aria-label="Menu akun">{accountNav.map(renderLink)}</nav>
        <div className="nav-list" style={{ marginTop: 0 }}>
          <a className="nav-link" href="mailto:bantuan@danaku.app"><CircleHelp size={16} />Bantuan</a>
        </div>
        <div className="sidebar-spacer" />
        <div className="sidebar-account">
          <div className="avatar">{initials}</div>
          <div className="account-copy"><strong>{displayName}</strong><span>{user?.email ?? 'Mode pratinjau'}</span></div>
          {user ? (
            <button className="account-signout" onClick={() => void signOut()} aria-label="Keluar"><LogOut size={15} /></button>
          ) : (
            <Link className="account-signout" href="/login" aria-label="Masuk"><ArrowUpRight size={15} /></Link>
          )}
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Buka navigasi"><Menu size={17} /></button>
          <div className="page-heading"><h1>{title}</h1><p>{subtitle}</p></div>
          <div className="top-actions">
            <button className="icon-button desktop-only" aria-label="Notifikasi"><Bell size={16} /><span className="notice-dot" /></button>
            <Link className="icon-button desktop-only" href="/assistant" aria-label="Buka AI assistant"><Bot size={16} /></Link>
            {!user && <Link className="secondary-button" href="/login">Masuk</Link>}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
