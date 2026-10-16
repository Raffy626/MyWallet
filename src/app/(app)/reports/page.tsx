'use client';

import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, FileChartColumnIncreasing } from 'lucide-react';
import { DemoBanner } from '@/components/demo-banner';
import { formatRupiah } from '@/lib/data/demo';

const periods = { harian: 'Hari ini', bulanan: 'Bulan ini', tahunan: 'Tahun ini' } as const;
type Period = keyof typeof periods;

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('bulanan');
  return (
    <div className="page-content">
      <DemoBanner />
      <div className="dashboard-intro"><div><h2>Laporan keuangan</h2><p>Gambaran singkat tentang pemasukan, pengeluaran, dan saldo bersih.</p></div><div className="page-actions"><select className="period-select" value={period} onChange={(event) => setPeriod(event.target.value as Period)} aria-label="Periode laporan">{Object.entries(periods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button className="secondary-button" onClick={() => window.print()}><Download size={14} /> Unduh / cetak</button></div></div>
      <section className="report-grid">
        <article className="metric-card"><div className="metric-top">Pemasukan <span className="metric-icon"><ArrowDownRight size={16} /></span></div><div className="metric-value">{period === 'tahunan' ? 'Rp 96,2 jt' : period === 'harian' ? 'Rp 186 rb' : 'Rp 8,75 jt'}</div><div className="metric-foot"><span className="trend-positive">+8,4%</span><span>vs. periode sebelumnya</span></div></article>
        <article className="metric-card"><div className="metric-top">Pengeluaran <span className="metric-icon" style={{ color: '#b87b54', background: '#fff5eb' }}><ArrowUpRight size={16} /></span></div><div className="metric-value">{period === 'tahunan' ? 'Rp 48,7 jt' : period === 'harian' ? 'Rp 186 rb' : 'Rp 3,42 jt'}</div><div className="metric-foot"><span className="trend-positive">−3,2%</span><span>vs. periode sebelumnya</span></div></article>
        <article className="metric-card"><div className="metric-top">Saldo bersih <span className="metric-icon"><FileChartColumnIncreasing size={16} /></span></div><div className="metric-value">{period === 'tahunan' ? 'Rp 47,5 jt' : period === 'harian' ? 'Rp 0' : 'Rp 5,33 jt'}</div><div className="metric-foot"><span>Akumulasi {periods[period].toLowerCase()}</span></div></article>
      </section>
      <section className="content-grid" style={{ gridTemplateColumns: '1fr' }}>
        <article className="panel"><div className="panel-header"><div><h3 className="panel-title">Arus kas · {periods[period]}</h3><p className="panel-subtitle">Perbandingan pemasukan dan pengeluaran</p></div><span className="status-pill">Data contoh</span></div><div className="chart-wrap"><svg viewBox="0 0 760 230" preserveAspectRatio="none" role="img" aria-label={`Grafik laporan ${period}`}><defs><linearGradient id="report-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4cc38c" stopOpacity=".19"/><stop offset="1" stopColor="#4cc38c" stopOpacity="0"/></linearGradient></defs>{[30,80,130,180].map((y) => <line key={y} x1="50" x2="750" y1={y} y2={y} className="chart-grid-line"/>)}<text x="2" y="34" className="chart-label">Rp 10 jt</text><text x="2" y="84" className="chart-label">Rp 7,5 jt</text><text x="2" y="134" className="chart-label">Rp 5 jt</text><text x="2" y="184" className="chart-label">Rp 2,5 jt</text><path d="M50 145 L130 100 L210 118 L290 80 L370 110 L450 54 L530 86 L610 72 L690 40 L750 62 L750 180 L50 180 Z" fill="url(#report-area)"/><polyline points="50,145 130,100 210,118 290,80 370,110 450,54 530,86 610,72 690,40 750,62" className="chart-income"/><polyline points="50,164 130,150 210,161 290,141 370,152 450,131 530,148 610,130 690,145 750,135" className="chart-expense"/><text x="50" y="214" className="chart-label">01</text><text x="220" y="214" className="chart-label">06</text><text x="390" y="214" className="chart-label">11</text><text x="560" y="214" className="chart-label">16</text><text x="730" y="214" className="chart-label">31</text></svg></div></article>
        <article className="panel"><div className="panel-header"><div><h3 className="panel-title">Ringkasan periode</h3><p className="panel-subtitle">Rangkuman berdasarkan transaksi demo</p></div></div><div className="settings-list"><div className="setting-row"><div><strong>Rasio menabung</strong><span>Saldo bersih dibanding pemasukan</span></div><strong>61%</strong></div><div className="setting-row"><div><strong>Rata-rata pengeluaran harian</strong><span>Selama bulan berjalan</span></div><strong>{formatRupiah(171000)}</strong></div><div className="setting-row"><div><strong>Kategori terbesar</strong><span>Makanan &amp; minuman</span></div><strong>{formatRupiah(1240000)}</strong></div></div></article>
      </section>
    </div>
  );
}
