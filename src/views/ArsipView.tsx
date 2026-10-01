import React, { useState, useMemo } from 'react';
import { 
  Archive, 
  Save, 
  Lock, 
  Unlock, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  History,
  TrendingUp,
  Calendar,
  Layers,
  Award,
  BarChart3,
  RotateCcw,
  Users,
  Target,
  Clock,
  ShieldCheck,
  Percent,
  MapPin,
  Sparkles,
  Database,
  RefreshCw,
  Cloud
} from 'lucide-react';
import { AppState, VARIANTS, ArchiveRecord, ArchiveRow } from '../types';
import { formatNumber, formatPercent, getPeriodInfo } from '../services/storage';

interface ArsipViewProps {
  state: AppState;
  onSaveCurrentMonthArchive: () => void;
  onUnlockArchive: (archiveKey: string) => void;
  onImportCsvArchive: (csvText: string) => void;
  onSelectArchive: (archiveKey: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isSyncing?: boolean;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onManualSync?: () => void;
  onForcePushArchive?: () => void;
}

type ArchiveTab = 'item_sales' | 'target_eval' | 'ops_bb' | 'all_columns';
type HistoricalMetric = 'total' | 'rata' | 'bb' | 'syl' | 'coverage';

export const ArsipView: React.FC<ArsipViewProps> = ({
  state,
  onSaveCurrentMonthArchive,
  onUnlockArchive,
  onImportCsvArchive,
  onSelectArchive,
  showToast,
  isSyncing = false,
  syncStatus = 'idle',
  onManualSync,
  onForcePushArchive
}) => {
  const [csvInput, setCsvInput] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState<ArchiveTab>('item_sales');
  const [histMetric, setHistMetric] = useState<HistoricalMetric>('total');

  const hasSupabase = Boolean(state.supabaseConfig?.u && state.supabaseConfig?.k);

  // Sort descending for selector (Agustus down to Januari)
  const archiveKeysDesc = Object.keys(state.archives).sort((a, b) => b.localeCompare(a));
  // Sort ascending for chronological trend table (Januari to Agustus)
  const archiveKeysAsc = Object.keys(state.archives).sort((a, b) => a.localeCompare(b));

  const activeKey = state.activeArchiveKey || archiveKeysDesc[0] || '2026-08';
  const activeArchive = state.archives[activeKey];

  // Overall Statistics across all archives
  const allArchives = Object.values(state.archives);
  const totalMonths = allArchives.length;
  const grandTotalBottles = allArchives.reduce((sum, arc) => {
    return sum + arc.rows.reduce((rSum, row) => rSum + (row.total || 0), 0);
  }, 0);
  const avgBottlesPerMonth = totalMonths > 0 ? Math.round(grandTotalBottles / totalMonths) : 0;

  // Best performing month
  const bestMonth = useMemo(() => {
    let best: { namaBulan: string; total: number } | null = null;
    for (const arc of allArchives) {
      const total = arc.rows.reduce((sum, r) => sum + (r.total || 0), 0);
      if (!best || total > best.total) {
        best = { namaBulan: arc.namaBulan, total };
      }
    }
    return best;
  }, [allArchives]);

  // Active Month KPI Calculations
  const activeStats = useMemo(() => {
    if (!activeArchive || !activeArchive.rows) return null;
    const rows = activeArchive.rows;
    const d = activeArchive.d || 31;

    const totalSold = rows.reduce((s, r) => s + (r.total || 0), 0);
    const avgDailySold = Math.round(totalSold / d);
    const totalYo = rows.reduce((s, r) => s + (r.varian[0] || 0), 0);
    const totalOm = rows.reduce((s, r) => s + (r.varian[1] || 0), 0);
    const totalOs = rows.reduce((s, r) => s + (r.varian[2] || 0), 0);
    const totalYt = rows.reduce((s, r) => s + (r.varian[3] || 0), 0);

    const totalRataYo = rows.reduce((s, r) => s + (r.rataVarian ? r.rataVarian[0] : Math.round(r.varian[0] / d)), 0);
    const totalRataOm = rows.reduce((s, r) => s + (r.rataVarian ? r.rataVarian[1] : Math.round(r.varian[1] / d)), 0);
    const totalRataOs = rows.reduce((s, r) => s + (r.rataVarian ? r.rataVarian[2] : Math.round(r.varian[2] / d)), 0);
    const totalRataYt = rows.reduce((s, r) => s + (r.rataVarian ? r.rataVarian[3] : Math.round(r.varian[3] / d)), 0);

    const totalTargetHarian = rows.reduce((s, r) => s + (r.targetHarian || 0), 0);
    const totalBulanLalu = rows.reduce((s, r) => s + (r.bulanLalu || 0), 0);
    const totalTahunLalu = rows.reduce((s, r) => s + (r.tahunLalu || 0), 0);

    const totalBb = rows.reduce((s, r) => s + (r.akmBb || 0), 0);
    const bbPct = totalSold > 0 ? (totalBb / totalSold) : 0;

    const totalArea = rows.reduce((s, r) => s + (r.jumlahArea || 0), 0);
    const totalYl = rows.reduce((s, r) => s + (r.jumlahYl || 0), 0);
    const coveragePct = totalArea > 0 ? (totalYl / totalArea) : 1;

    const totalJwp = rows.reduce((s, r) => s + (r.akmJwp || 0), 0);
    const totalAbsen = rows.reduce((s, r) => s + (r.absenYl || 0), 0);
    const totalFrek = rows.reduce((s, r) => s + (r.frekuensiAbsen || 0), 0);
    const avgSyl = totalJwp > 0 ? Math.round(totalSold / totalJwp) : 0;

    const vsTargetPct = totalTargetHarian > 0 ? (avgDailySold / totalTargetHarian) : 1;
    const vsLmPct = totalBulanLalu > 0 ? (avgDailySold / totalBulanLalu) : 1;
    const vsLyPct = totalTahunLalu > 0 ? (avgDailySold / totalTahunLalu) : 1;

    return {
      totalSold,
      avgDailySold,
      totalYo,
      totalOm,
      totalOs,
      totalYt,
      totalRataYo,
      totalRataOm,
      totalRataOs,
      totalRataYt,
      totalTargetHarian,
      vsTargetPct,
      totalBulanLalu,
      vsLmPct,
      totalTahunLalu,
      vsLyPct,
      totalBb,
      bbPct,
      totalArea,
      totalYl,
      coveragePct,
      totalJwp,
      avgSyl,
      totalAbsen,
      totalFrek
    };
  }, [activeArchive]);

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvInput.trim()) {
      showToast('Tempel data CSV terlebih dahulu', 'error');
      return;
    }
    onImportCsvArchive(csvInput);
    setCsvInput('');
    setShowImport(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Archive className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Arsip Rekam Jejak Penjualan (2026)
              </h1>
              <p className="text-xs text-neutral-500">
                Data historis realisasi bulanan Januari s/d Agustus 2026 lengkap dengan indikator penjualan & operasional
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              onSaveCurrentMonthArchive();
              showToast(`Bulan ${getPeriodInfo(state).label} berhasil diarsipkan!`, 'success');
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Bulan Ini</span>
          </button>

          {activeArchive && (
            <button
              onClick={() => {
                onUnlockArchive(activeKey);
                showToast(`Kunci arsip ${activeKey} dibuka untuk koreksi`, 'info');
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 transition-colors"
            >
              {activeArchive.terkunci ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />}
              <span>{activeArchive.terkunci ? 'Buka Kunci' : 'Terkunci (Siap Edit)'}</span>
            </button>
          )}

          <button
            onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-rose-600" />
            <span>Impor CSV</span>
          </button>
        </div>
      </div>

      {/* Supabase Cloud Storage Info & Sync Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            hasSupabase 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
          }`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Penyimpanan Cloud Supabase
              </h2>
              {hasSupabase ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {syncStatus === 'syncing' ? 'Menyinkronkan...' : 'Terhubung & Tersimpan'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                  Belum Terhubung
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {hasSupabase 
                ? `Seluruh ${totalMonths} periode arsip tersimpan aman & tersinkronisasi otomatis di tabel app_store Supabase.` 
                : 'Koneksi Supabase belum diisi. Masukkan URL & API Key di menu Pengaturan agar arsip otomatis tersimpan ke cloud.'}
            </p>
          </div>
        </div>

        {hasSupabase && onForcePushArchive && (
          <button
            onClick={onForcePushArchive}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyimpan ke Cloud...' : 'Simpan Semua Arsip ke Supabase'}</span>
          </button>
        )}
      </div>

      {/* Summary KPI Cards across Archives */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Periode Arsip</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {totalMonths} Bulan
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            Januari – Agustus 2026
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Total Botol Terarsip</span>
            <Layers className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {formatNumber(grandTotalBottles)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            Botol seluruh cabang
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Rata-rata / Bulan</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
            {formatNumber(avgBottlesPerMonth)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            Botol / bulan operasional
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
            <span>Bulan Tertinggi</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {bestMonth ? bestMonth.namaBulan : '—'}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5 font-mono">
            {bestMonth ? `${formatNumber(bestMonth.total)} btl` : '—'}
          </div>
        </div>
      </div>

      {/* Impor Spreadsheet Accordion */}
      {showImport && (
        <form
          onSubmit={handleImportSubmit}
          className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-rose-200 dark:border-rose-900 shadow-md space-y-3 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Impor Arsip Bulan Lama dari Data CSV
            </h2>
          </div>
          <p className="text-xs text-neutral-500 leading-normal">
            Tempel data per baris: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono">tanggal,nama_tku,varian,botol,bb</code>.<br />
            Contoh: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono">2026-08-01,Jember,YO,1990,150</code>. Varian yang valid: YO, OM, OS, YT.
          </p>

          <textarea
            rows={5}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder="2026-07-01,Jember,YO,2100,120&#10;2026-07-01,Jember,OM,310,20&#10;2026-07-01,Pelita,YO,2400,135"
            className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowImport(false)}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
            >
              Proses & Tambah ke Arsip
            </button>
          </div>
        </form>
      )}

      {/* Archive Month Selector Chips (Agustus s/d Januari 2026) */}
      {archiveKeysDesc.length > 0 && (
        <div className="p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              Pilih Periode Arsip (Agustus s/d Januari 2026):
            </span>
            <span className="text-[11px] text-neutral-500">
              {archiveKeysDesc.length} Periode Tersedia
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {archiveKeysDesc.map(k => {
              const arc = state.archives[k];
              const isSelected = k === activeKey;
              const totalBtl = arc?.rows ? arc.rows.reduce((sum, r) => sum + r.total, 0) : 0;
              return (
                <button
                  key={k}
                  onClick={() => onSelectArchive(k)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex flex-col items-start gap-0.5 ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                      : 'bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <span className="font-bold">{arc?.namaBulan || k}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-rose-100' : 'text-neutral-500'}`}>
                    {formatNumber(totalBtl)} btl
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Archive Snapshot Details */}
      {activeArchive && activeStats ? (
        <div className="space-y-4">
          {/* Active Month Operational & Sales KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Penjualan & Target */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Penjualan & Target</span>
                <Target className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                {formatNumber(activeStats.totalSold)} <span className="text-xs font-normal text-neutral-500">btl</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                <span>Rata: <b className="text-neutral-800 dark:text-neutral-200 font-mono">{formatNumber(activeStats.avgDailySold)}</b>/hr</span>
                <span className={`font-bold ${activeStats.vsTargetPct >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {formatPercent(activeStats.vsTargetPct)} Tgt
                </span>
              </div>
            </div>

            {/* Card 2: Balik Botol */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Akumulasi Balik Botol</span>
                <RotateCcw className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                {formatNumber(activeStats.totalBb)} <span className="text-xs font-normal text-neutral-500">btl</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                <span>Rasio Retur:</span>
                <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                  {formatPercent(activeStats.bbPct)}
                </span>
              </div>
            </div>

            {/* Card 3: s/YL & JWP */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">s/YL</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                {activeStats.avgSyl} <span className="text-xs font-normal text-neutral-500">btl</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                <span>Akm JWP:</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200 font-mono">
                  {formatNumber(activeStats.totalJwp)}
                </span>
              </div>
            </div>

            {/* Card 4: Coverage Area & Presensi */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between text-neutral-500 text-xs mb-1">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Area & Presensi YL</span>
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                {formatPercent(activeStats.coveragePct)} <span className="text-xs font-normal text-neutral-500">Cover</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1 border-t border-neutral-100 dark:border-neutral-800 pt-1">
                <span>{activeStats.totalYl}/{activeStats.totalArea} YL Area</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  Absen: {activeStats.totalAbsen} (Frek {activeStats.totalFrek})
                </span>
              </div>
            </div>
          </div>

          {/* Table Container with Tab Navigation */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-rose-600" />
                  <span>Detail Rekapitulasi: {activeArchive.namaBulan}</span>
                </h2>
                <p className="text-xs text-neutral-500">
                  {activeArchive.d} Hari Operasional &bull; Status: {activeArchive.terkunci ? 'Arsip Final' : 'Buka Kunci'}
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
                <button
                  onClick={() => setActiveTab('item_sales')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'item_sales'
                      ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  Rata & Varian Item
                </button>
                <button
                  onClick={() => setActiveTab('target_eval')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'target_eval'
                      ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  Vs Target, Bln Lalu & Thn Lalu
                </button>
                <button
                  onClick={() => setActiveTab('ops_bb')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'ops_bb'
                      ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  Balik Botol & Operasional YL
                </button>
                <button
                  onClick={() => setActiveTab('all_columns')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === 'all_columns'
                      ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  Semua Kolom
                </button>
              </div>
            </div>

            {/* TAB 1: Rata-rata per Item & Varian */}
            {activeTab === 'item_sales' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                      <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                      <th className="py-2.5 px-2 font-semibold">Rayon</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">YO (Ori)</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-rose-700/70">Rata YO</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">OM (Mangga)</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-amber-700/70">Rata OM</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-pink-600 dark:text-pink-400">OS (Stroberi)</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-pink-700/70">Rata OS</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-sky-600 dark:text-sky-400">YT (Light)</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-sky-700/70">Rata YT</th>
                      <th className="py-2.5 px-4 text-right font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-100/50 dark:bg-neutral-800/50">Total Botol</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Rata/Hari</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                    {activeArchive.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                          {row.nama}
                        </td>
                        <td className="py-3 px-2 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            row.rayon === 1 ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700'
                          }`}>
                            R{row.rayon}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(row.varian[0])}</td>
                        <td className="py-3 px-3 text-right text-neutral-500">{formatNumber(row.rataVarian ? row.rataVarian[0] : Math.round(row.varian[0]/activeArchive.d))}</td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(row.varian[1])}</td>
                        <td className="py-3 px-3 text-right text-neutral-500">{formatNumber(row.rataVarian ? row.rataVarian[1] : Math.round(row.varian[1]/activeArchive.d))}</td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">{row.varian[2] > 0 ? formatNumber(row.varian[2]) : '—'}</td>
                        <td className="py-3 px-3 text-right text-neutral-500">{row.rataVarian && row.rataVarian[2] > 0 ? formatNumber(row.rataVarian[2]) : (row.varian[2] > 0 ? formatNumber(Math.round(row.varian[2]/activeArchive.d)) : '—')}</td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">{formatNumber(row.varian[3])}</td>
                        <td className="py-3 px-3 text-right text-neutral-500">{formatNumber(row.rataVarian ? row.rataVarian[3] : Math.round(row.varian[3]/activeArchive.d))}</td>
                        <td className="py-3 px-4 text-right font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-100/30 dark:bg-neutral-800/30">
                          {formatNumber(row.total)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                          {formatNumber(row.rataHarian || Math.round(row.total / activeArchive.d))}
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr className="bg-rose-50/60 dark:bg-rose-950/30 font-bold border-t-2 border-rose-200 dark:border-rose-900/60 text-xs">
                      <td colSpan={2} className="py-3.5 px-3 font-sans text-rose-700 dark:text-rose-400">Total Cabang</td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalYo)}</td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalRataYo)}</td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalOm)}</td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalRataOm)}</td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400">{activeStats.totalOs > 0 ? formatNumber(activeStats.totalOs) : '—'}</td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400">{activeStats.totalRataOs > 0 ? formatNumber(activeStats.totalRataOs) : '—'}</td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalYt)}</td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalRataYt)}</td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-rose-700 dark:text-rose-400 text-sm bg-rose-100/40 dark:bg-rose-900/40">
                        {formatNumber(activeStats.totalSold)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-extrabold text-rose-700 dark:text-rose-400">
                        {formatNumber(activeStats.avgDailySold)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Vs Target, Bulan Lalu & Tahun Lalu */}
            {activeTab === 'target_eval' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                      <th className="py-2.5 px-4 font-semibold">Nama TKU</th>
                      <th className="py-2.5 px-3 font-semibold">Rayon</th>
                      <th className="py-2.5 px-4 text-right font-bold text-neutral-900 dark:text-neutral-100">Total Botol</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Rata/Hari</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">Target/Hari</th>
                      <th className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">% Vs Target</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">Pjl Bln Lalu</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-blue-600 dark:text-blue-400">% LM</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Pjl Thn Lalu</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">% LY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                    {activeArchive.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-4 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                          {row.nama}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            row.rayon === 1 ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700'
                          }`}>
                            Rayon {row.rayon}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-neutral-900 dark:text-neutral-100">
                          {formatNumber(row.total)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                          {formatNumber(row.rataHarian || Math.round(row.total / activeArchive.d))}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.targetHarian ? formatNumber(row.targetHarian) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          {row.vsTargetPct !== undefined ? (
                            <span className={row.vsTargetPct >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                              {formatPercent(row.vsTargetPct)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-600 dark:text-neutral-400">
                          {row.bulanLalu ? formatNumber(row.bulanLalu) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-blue-600 dark:text-blue-400 font-semibold">
                          {row.vsLmPct ? formatPercent(row.vsLmPct) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-600 dark:text-neutral-400">
                          {row.tahunLalu ? formatNumber(row.tahunLalu) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                          {row.vsLyPct ? formatPercent(row.vsLyPct) : '—'}
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr className="bg-rose-50/60 dark:bg-rose-950/30 font-bold border-t-2 border-rose-200 dark:border-rose-900/60 text-xs">
                      <td colSpan={2} className="py-3.5 px-4 font-sans text-rose-700 dark:text-rose-400">
                        Total Cabang
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-rose-700 dark:text-rose-400 text-sm">
                        {formatNumber(activeStats.totalSold)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {formatNumber(activeStats.avgDailySold)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {formatNumber(activeStats.totalTargetHarian)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-extrabold text-rose-700 dark:text-rose-400">
                        {formatPercent(activeStats.vsTargetPct)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {formatNumber(activeStats.totalBulanLalu)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {formatPercent(activeStats.vsLmPct)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {formatNumber(activeStats.totalTahunLalu)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {formatPercent(activeStats.vsLyPct)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: Balik Botol & Kondisi Operasional YL */}
            {activeTab === 'ops_bb' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                      <th className="py-2.5 px-4 font-semibold">Nama TKU</th>
                      <th className="py-2.5 px-3 font-semibold">Rayon</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-sky-600 dark:text-sky-400">Akm BB (btl)</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-sky-600 dark:text-sky-400">% BB</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">Akm JWP</th>
                      <th className="py-2.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400">s/YL</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">YL Absen</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">Frekuensi</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Jml Area</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Jml YL</th>
                      <th className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">% Coverage</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400 border-l border-neutral-200 dark:border-neutral-700">YL &lt; 250</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">YL &lt; 300</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                    {activeArchive.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-4 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                          {row.nama}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            row.rayon === 1 ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700'
                          }`}>
                            Rayon {row.rayon}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.akmBb !== undefined ? formatNumber(row.akmBb) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-sky-600 dark:text-sky-400 font-semibold">
                          {row.akmBbPct !== undefined ? formatPercent(row.akmBbPct) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.akmJwp !== undefined ? formatNumber(row.akmJwp) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                          {row.sYl !== undefined ? row.sYl : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.absenYl !== undefined ? row.absenYl : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.frekuensiAbsen !== undefined ? row.frekuensiAbsen : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.jumlahArea !== undefined ? row.jumlahArea : '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          {row.jumlahYl !== undefined ? row.jumlahYl : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          {row.coverageArea !== undefined ? (
                            <span className={row.coverageArea >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                              {formatPercent(row.coverageArea)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400 border-l border-neutral-200 dark:border-neutral-700">
                          {row.l250 !== undefined ? row.l250 : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {row.l300 !== undefined ? row.l300 : '—'}
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr className="bg-rose-50/60 dark:bg-rose-950/30 font-bold border-t-2 border-rose-200 dark:border-rose-900/60 text-xs">
                      <td colSpan={2} className="py-3.5 px-4 font-sans text-rose-700 dark:text-rose-400">
                        Total Cabang
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {formatNumber(activeStats.totalBb)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {formatPercent(activeStats.bbPct)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {formatNumber(activeStats.totalJwp)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-extrabold text-rose-700 dark:text-rose-400">
                        {activeStats.avgSyl}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {activeStats.totalAbsen}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {activeStats.totalFrek}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {activeStats.totalArea}
                      </td>
                      <td className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {activeStats.totalYl}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-rose-700 dark:text-rose-400">
                        {formatPercent(activeStats.coveragePct)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: Semua Kolom (Full Comprehensive View) */}
            {activeTab === 'all_columns' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1400px]">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 bg-neutral-50 dark:bg-neutral-800/40">
                      <th className="py-2.5 px-3 font-semibold sticky left-0 bg-neutral-50 dark:bg-neutral-800 z-10">Nama TKU</th>
                      <th className="py-2.5 px-2 font-semibold">R</th>
                      <th className="py-2.5 px-2 text-right">YO</th>
                      <th className="py-2.5 px-2 text-right">OM</th>
                      <th className="py-2.5 px-2 text-right">OS</th>
                      <th className="py-2.5 px-2 text-right">YT</th>
                      <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">Total Btl</th>
                      <th className="py-2.5 px-2 text-right font-semibold">Rata/Hr</th>
                      <th className="py-2.5 px-2 text-right">Target</th>
                      <th className="py-2.5 px-2 text-right font-bold">% Tgt</th>
                      <th className="py-2.5 px-2 text-right">Bln Lalu</th>
                      <th className="py-2.5 px-2 text-right">% LM</th>
                      <th className="py-2.5 px-2 text-right">Thn Lalu</th>
                      <th className="py-2.5 px-2 text-right">% LY</th>
                      <th className="py-2.5 px-2 text-right">Akm BB</th>
                      <th className="py-2.5 px-2 text-right">% BB</th>
                      <th className="py-2.5 px-2 text-right">JWP</th>
                      <th className="py-2.5 px-2 text-right font-bold">S/YL</th>
                      <th className="py-2.5 px-2 text-right text-rose-600">Absen</th>
                      <th className="py-2.5 px-2 text-right text-rose-600">Frek</th>
                      <th className="py-2.5 px-2 text-right">Area</th>
                      <th className="py-2.5 px-2 text-right">YL</th>
                      <th className="py-2.5 px-3 text-right font-bold">% Cover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-[11px]">
                    {activeArchive.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100 sticky left-0 bg-white dark:bg-neutral-900 z-10 border-r border-neutral-100 dark:border-neutral-800">
                          {row.nama}
                        </td>
                        <td className="py-2.5 px-2 text-neutral-500">R{row.rayon}</td>
                        <td className="py-2.5 px-2 text-right">{formatNumber(row.varian[0])}</td>
                        <td className="py-2.5 px-2 text-right">{formatNumber(row.varian[1])}</td>
                        <td className="py-2.5 px-2 text-right">{row.varian[2] > 0 ? formatNumber(row.varian[2]) : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{formatNumber(row.varian[3])}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-800/30">
                          {formatNumber(row.total)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold">{formatNumber(row.rataHarian || Math.round(row.total/activeArchive.d))}</td>
                        <td className="py-2.5 px-2 text-right">{row.targetHarian ? formatNumber(row.targetHarian) : '—'}</td>
                        <td className="py-2.5 px-2 text-right font-bold">{row.vsTargetPct ? formatPercent(row.vsTargetPct) : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.bulanLalu ? formatNumber(row.bulanLalu) : '—'}</td>
                        <td className="py-2.5 px-2 text-right text-blue-600">{row.vsLmPct ? formatPercent(row.vsLmPct) : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.tahunLalu ? formatNumber(row.tahunLalu) : '—'}</td>
                        <td className="py-2.5 px-2 text-right text-emerald-600">{row.vsLyPct ? formatPercent(row.vsLyPct) : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.akmBb ? formatNumber(row.akmBb) : '—'}</td>
                        <td className="py-2.5 px-2 text-right text-sky-600">{row.akmBbPct ? formatPercent(row.akmBbPct) : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.akmJwp ? formatNumber(row.akmJwp) : '—'}</td>
                        <td className="py-2.5 px-2 text-right font-bold">{row.sYl !== undefined ? row.sYl : '—'}</td>
                        <td className="py-2.5 px-2 text-right text-rose-600">{row.absenYl !== undefined ? row.absenYl : '—'}</td>
                        <td className="py-2.5 px-2 text-right text-rose-600">{row.frekuensiAbsen !== undefined ? row.frekuensiAbsen : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.jumlahArea !== undefined ? row.jumlahArea : '—'}</td>
                        <td className="py-2.5 px-2 text-right">{row.jumlahYl !== undefined ? row.jumlahYl : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{row.coverageArea !== undefined ? formatPercent(row.coverageArea) : '—'}</td>
                      </tr>
                    ))}

                    {/* Grand Total */}
                    <tr className="bg-rose-50/60 dark:bg-rose-950/30 font-bold border-t-2 border-rose-200 dark:border-rose-900/60 text-xs">
                      <td className="py-3 px-3 font-sans text-rose-700 dark:text-rose-400 sticky left-0 bg-rose-50/90 dark:bg-rose-950/90 z-10 border-r border-rose-200 dark:border-rose-900">
                        Total Cabang
                      </td>
                      <td className="py-3 px-2 text-rose-700 dark:text-rose-400">All</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalYo)}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalOm)}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{activeStats.totalOs > 0 ? formatNumber(activeStats.totalOs) : '—'}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalYt)}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-rose-700 dark:text-rose-400 bg-rose-100/40 dark:bg-rose-900/40">{formatNumber(activeStats.totalSold)}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400 font-bold">{formatNumber(activeStats.avgDailySold)}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400 font-bold">{formatNumber(activeStats.totalTargetHarian)}</td>
                      <td className="py-3 px-2 text-right font-extrabold text-rose-700 dark:text-rose-400">{formatPercent(activeStats.vsTargetPct)}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalBulanLalu)}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatPercent(activeStats.vsLmPct)}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalTahunLalu)}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatPercent(activeStats.vsLyPct)}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalBb)}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatPercent(activeStats.bbPct)}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatNumber(activeStats.totalJwp)}</td>
                      <td className="py-3 px-2 text-right font-extrabold text-rose-700 dark:text-rose-400">{activeStats.avgSyl}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{activeStats.totalAbsen}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{activeStats.totalFrek}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{activeStats.totalArea}</td>
                      <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{activeStats.totalYl}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-rose-700 dark:text-rose-400">{formatPercent(activeStats.coveragePct)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-500">
          Belum ada arsip bulan tersimpan. Klik "Simpan Bulan Ini" untuk mengarsipkan rekapitulasi saat ini.
        </div>
      )}

      {/* Record TKU History Table Across All Archived Months (Januari - Agustus 2026) */}
      {archiveKeysAsc.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <History className="w-4 h-4 text-rose-600" />
                <span>Rekam Jejak Historis Antar Bulan (Januari – Agustus 2026)</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Perbandingan performa antar periode untuk setiap unit TKU
              </p>
            </div>

            {/* Historical Metric Selector */}
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setHistMetric('total')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  histMetric === 'total'
                    ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Total Botol
              </button>
              <button
                onClick={() => setHistMetric('rata')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  histMetric === 'rata'
                    ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                Rata/Hari
              </button>
              <button
                onClick={() => setHistMetric('bb')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  histMetric === 'bb'
                    ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                BB
              </button>
              <button
                onClick={() => setHistMetric('syl')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  histMetric === 'syl'
                    ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                s/YL
              </button>
              <button
                onClick={() => setHistMetric('coverage')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  histMetric === 'coverage'
                    ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                % Coverage Area
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                  <th className="py-2.5 px-4 font-semibold sticky left-0 bg-neutral-50 dark:bg-neutral-800 z-10">Nama Unit TKU</th>
                  {archiveKeysAsc.map(k => (
                    <th key={k} className="py-2.5 px-3 text-right font-semibold">
                      {state.archives[k]?.namaBulan.replace(' 2026', '') || k}
                    </th>
                  ))}
                  <th className="py-2.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20">
                    {histMetric === 'total' || histMetric === 'bb' ? 'Total 8 Bulan' : 'Rata-rata 8 Bulan'}
                  </th>
                  <th className="py-2.5 px-4 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                    {histMetric === 'total' ? 'Rata-rata/Bln' : 'Nilai Terakhir'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                {state.tkus.map(t => {
                  let sumVal = 0;
                  let countVal = 0;
                  let latestVal = 0;

                  return (
                    <tr key={t.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4 font-sans font-semibold text-neutral-900 dark:text-neutral-100 sticky left-0 bg-white dark:bg-neutral-900 z-10 border-r border-neutral-100 dark:border-neutral-800">
                        {t.nama}
                      </td>
                      {archiveKeysAsc.map(k => {
                        const arc = state.archives[k];
                        const row = arc?.rows.find(r => r.nama.toLowerCase() === t.nama.toLowerCase());
                        let displayVal = '—';
                        if (row) {
                          countVal += 1;
                          if (histMetric === 'total') {
                            sumVal += row.total;
                            latestVal = row.total;
                            displayVal = formatNumber(row.total);
                          } else if (histMetric === 'rata') {
                            const rVal = row.rataHarian || Math.round(row.total / (arc?.d || 31));
                            sumVal += rVal;
                            latestVal = rVal;
                            displayVal = formatNumber(rVal);
                          } else if (histMetric === 'bb') {
                            const bbVal = row.akmBb || 0;
                            sumVal += bbVal;
                            latestVal = bbVal;
                            displayVal = formatNumber(bbVal);
                          } else if (histMetric === 'syl') {
                            const sylVal = row.sYl || 0;
                            sumVal += sylVal;
                            latestVal = sylVal;
                            displayVal = String(sylVal);
                          } else if (histMetric === 'coverage') {
                            const covVal = row.coverageArea || (row.jumlahArea ? (row.jumlahYl || 0)/row.jumlahArea : 1);
                            sumVal += covVal;
                            latestVal = covVal;
                            displayVal = formatPercent(covVal);
                          }
                        }
                        return (
                          <td key={k} className="py-3 px-3 text-right font-medium text-neutral-700 dark:text-neutral-300">
                            {displayVal}
                          </td>
                        );
                      })}

                      {/* Summary Col 1 */}
                      <td className="py-3 px-4 text-right font-bold text-rose-700 dark:text-rose-300 bg-rose-50/40 dark:bg-rose-950/10">
                        {histMetric === 'coverage' 
                          ? (countVal > 0 ? formatPercent(sumVal / countVal) : '—')
                          : (histMetric === 'syl' || histMetric === 'rata'
                              ? (countVal > 0 ? formatNumber(Math.round(sumVal / countVal)) : '—')
                              : formatNumber(sumVal))}
                      </td>

                      {/* Summary Col 2 */}
                      <td className="py-3 px-4 text-right font-semibold text-neutral-800 dark:text-neutral-200">
                        {histMetric === 'total' 
                          ? (countVal > 0 ? formatNumber(Math.round(sumVal / countVal)) : '—')
                          : (histMetric === 'coverage' ? formatPercent(latestVal) : formatNumber(latestVal))}
                      </td>
                    </tr>
                  );
                })}

                {/* Grand Total Row Across All Months */}
                <tr className="bg-rose-50/60 dark:bg-rose-950/30 font-bold border-t-2 border-rose-200 dark:border-rose-900/60 text-xs">
                  <td className="py-3.5 px-4 font-sans text-rose-700 dark:text-rose-400 sticky left-0 bg-rose-50/90 dark:bg-rose-950/90 z-10 border-r border-rose-200 dark:border-rose-900">
                    Total Cabang Jember
                  </td>
                  {archiveKeysAsc.map(k => {
                    const arc = state.archives[k];
                    if (!arc || !arc.rows) return <td key={k} className="py-3.5 px-3 text-right">—</td>;
                    const d = arc.d || 31;
                    let mVal = '—';
                    if (histMetric === 'total') {
                      mVal = formatNumber(arc.rows.reduce((s, r) => s + r.total, 0));
                    } else if (histMetric === 'rata') {
                      const totalSold = arc.rows.reduce((s, r) => s + r.total, 0);
                      mVal = formatNumber(Math.round(totalSold / d));
                    } else if (histMetric === 'bb') {
                      mVal = formatNumber(arc.rows.reduce((s, r) => s + (r.akmBb || 0), 0));
                    } else if (histMetric === 'syl') {
                      const totalSold = arc.rows.reduce((s, r) => s + r.total, 0);
                      const totalJwp = arc.rows.reduce((s, r) => s + (r.akmJwp || 0), 0);
                      mVal = totalJwp > 0 ? String(Math.round(totalSold / totalJwp)) : '—';
                    } else if (histMetric === 'coverage') {
                      const totalArea = arc.rows.reduce((s, r) => s + (r.jumlahArea || 0), 0);
                      const totalYl = arc.rows.reduce((s, r) => s + (r.jumlahYl || 0), 0);
                      mVal = totalArea > 0 ? formatPercent(totalYl / totalArea) : '100%';
                    }
                    return (
                      <td key={k} className="py-3.5 px-3 text-right text-rose-700 dark:text-rose-400 font-bold">
                        {mVal}
                      </td>
                    );
                  })}
                  
                  {/* Branch Summary 1 */}
                  <td className="py-3.5 px-4 text-right font-extrabold text-rose-700 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-900/40 text-sm">
                    {histMetric === 'total' ? formatNumber(grandTotalBottles) : '—'}
                  </td>

                  {/* Branch Summary 2 */}
                  <td className="py-3.5 px-4 text-right text-rose-700 dark:text-rose-400 font-extrabold">
                    {histMetric === 'total' ? formatNumber(avgBottlesPerMonth) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
