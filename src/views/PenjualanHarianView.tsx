import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Filter, 
  FileSpreadsheet,
  CheckCircle,
  Eye,
  Layers
} from 'lucide-react';
import { AppState, VARIANTS, VariantCode, DailySalesRecord } from '../types';
import { 
  formatNumber, 
  formatPercent, 
  formatDiff, 
  getStatusClass, 
  formatDateIndo,
  getPembagiHari,
  getPeriodInfo,
  getSeedDailyBranchTotal
} from '../services/storage';
import { PembagiHariControl } from '../components/PembagiHariControl';

interface PenjualanHarianViewProps {
  state: AppState;
  onSaveDailyData: (date: string, tkuIdx: number, record: DailySalesRecord) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onUpdatePembagiHari?: () => void;
  onUpdateActiveDay?: (day: number) => void;
}

export const PenjualanHarianView: React.FC<PenjualanHarianViewProps> = ({
  state,
  onSaveDailyData,
  showToast,
  onUpdatePembagiHari,
  onUpdateActiveDay
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(state.currentDayNum);

  // Info bulan kerja (tidak lagi di-hard-code September 2026)
  const period = getPeriodInfo(state);
  const MD = period.daysInMonth;
  const PY = period.year;
  const PM0 = period.monthIndex;
  const activeTkus = state.tkus.filter(t => t.aktif);
  const totalBranchTarget = activeTkus.reduce((a, b) => a + b.targetHarian, 0) || 1;

  // Generate ISO date for selectedDay
  const getIsoDate = (d: number) => {
    return `${state.activePeriod.slice(0, 8)}${String(d).padStart(2, '0')}`;
  };

  const currentDateIso = getIsoDate(selectedDay);

  // Helper to fetch record for a given date and TKU index
  const getRecordFor = (dateStr: string, tkuIdx: number): DailySalesRecord | null => {
    if (state.pjd[dateStr] && state.pjd[dateStr][tkuIdx]) {
      return state.pjd[dateStr][tkuIdx];
    }
    if (dateStr === state.activeDate && state.todayInputs[tkuIdx]) {
      return state.todayInputs[tkuIdx];
    }
    return null;
  };

  // Helper to calculate sales for a specific TKU on day d (1..30)
  const getTkuDailySales = (tkuIdx: number, d: number, variant: 'ALL' | VariantCode = 'ALL'): number => {
    const t = state.tkus[tkuIdx];
    if (!t || !t.aktif) return 0;

    const dateIso = getIsoDate(d);
    const rec = getRecordFor(dateIso, tkuIdx);

    // If day is today (day 24) and we have input:
    if (d === state.currentDayNum && rec) {
      if (variant === 'ALL') return rec.sold || 0;
      const vIdx = VARIANTS.findIndex(v => v.code === variant);
      return rec.v ? (rec.v[vIdx] || 0) : 0;
    }

    // If day is beyond today in current month, not happened yet
    if (d > state.currentDayNum) {
      return 0;
    }

    // If record exists in pjd:
    if (rec && rec.sold !== undefined) {
      if (variant === 'ALL') return rec.sold;
      const vIdx = VARIANTS.findIndex(v => v.code === variant);
      return rec.v ? (rec.v[vIdx] || 0) : 0;
    }

    // Historical day from INITIAL_DAILY_HISTORY
    const dateObj = new Date(PY, PM0, d);
    if (dateObj.getDay() === 0) {
      return 0; // Sunday libur
    }

    const branchDayTotal = getSeedDailyBranchTotal(state, d);
    const tkuProportion = t.targetHarian / totalBranchTarget;
    const tkuTotal = Math.round(branchDayTotal * tkuProportion);

    if (variant === 'ALL') {
      return tkuTotal;
    }

    const ratios: Record<VariantCode, number> = { YO: 0.76, OM: 0.09, OS: 0.11, YT: 0.04 };
    return Math.round(tkuTotal * ratios[variant]);
  };

  // Compute daily sums for Rayon 1, Rayon 2, and Cabang for selected date
  const computeDailySums = (rayonFilter: number | null) => {
    let sold = 0;
    let bb = 0;
    let pdm = 0;
    let absen = 0;
    let frek = 0;
    let l250 = 0;
    let l300 = 0;
    let vTotal = [0, 0, 0, 0];

    state.tkus.forEach((t, idx) => {
      if (!t.aktif) return;
      if (rayonFilter !== null && t.rayon !== rayonFilter) return;
      const rec = getRecordFor(currentDateIso, idx);
      if (rec) {
        sold += rec.sold || 0;
        bb += rec.bb || 0;
        absen += rec.absen || 0;
        frek += rec.frek || 0;
        l250 += rec.l250 ?? t.l250 ?? 0;
        l300 += rec.l300 ?? t.l300 ?? 0;
        pdm += (rec.pdm ?? 0) || (rec.pdmV ? rec.pdmV.reduce((a, b) => a + b, 0) : 0);
        rec.v?.forEach((x, i) => { vTotal[i] += x; });
      } else {
        l250 += t.l250 ?? 0;
        l300 += t.l300 ?? 0;
        // Fallback for past dates
        const s = getTkuDailySales(idx, selectedDay, 'ALL');
        sold += s;
        vTotal[0] += Math.round(s * 0.76);
        vTotal[1] += Math.round(s * 0.09);
        vTotal[2] += Math.round(s * 0.11);
        vTotal[3] += Math.round(s * 0.04);
      }
    });

    return { sold, bb, pdm, absen, frek, l250, l300, vTotal };
  };

  const r1Sum = computeDailySums(1);
  const r2Sum = computeDailySums(2);
  const cabangSum = computeDailySums(null);

  const r1Target = state.tkus.filter(t => t.rayon === 1 && t.aktif).reduce((a, b) => a + b.targetHarian, 0);
  const r2Target = state.tkus.filter(t => t.rayon === 2 && t.aktif).reduce((a, b) => a + b.targetHarian, 0);

  // Helper for export to CSV based on active view mode
  const handleExportCsv = () => {
    {
      const headers = [
        'TKU', 'Rayon', 'YO', 'OM', 'OS', 'YT', 'Total Terjual',
        'BB', '% BB', 'PDM', 'Absen', 'Frekuensi Absen'
      ];
      const rows = state.tkus.map((t, idx) => {
        const rec = getRecordFor(currentDateIso, idx);
        const v = rec?.v || [
          getTkuDailySales(idx, selectedDay, 'YO'),
          getTkuDailySales(idx, selectedDay, 'OM'),
          getTkuDailySales(idx, selectedDay, 'OS'),
          getTkuDailySales(idx, selectedDay, 'YT')
        ];
        const sold = rec?.sold ?? getTkuDailySales(idx, selectedDay, 'ALL');
        const bb = rec?.bb ?? 0;
        const pctBb = bb + sold > 0 ? ((bb / (bb + sold)) * 100).toFixed(1) + '%' : '0%';
        const pdm = rec ? ((rec.pdm ?? 0) || (rec.pdmV ? rec.pdmV.reduce((a, b) => a + b, 0) : 0)) : 0;
        const absen = rec?.absen ?? 0;
        const frek = rec?.frek ?? 0;

        return [
          t.nama, `Rayon ${t.rayon}`, v[0], v[1], v[2], v[3], sold,
          bb, pctBb, pdm, absen, frek
        ].join(',');
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
      downloadCsv(csvContent, `penjualan_harian_${currentDateIso}.csv`);
    }
  };

  const downloadCsv = (content: string, filename: string) => {
    const encodedUri = encodeURI(content);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(`Laporan ${filename} berhasil diunduh!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Penjualan Harian
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              {`Detail: ${formatDateIndo(currentDateIso)}`}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Pilih tanggal untuk melihat penjualan, BB, dan PDM yang sudah tersimpan pada tanggal tersebut. Rekap mingguan &amp; bulanan ada di menu Breakdown &amp; Realisasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
            title="Unduh Tabel Format CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Mode 1: PENGATUR PILIH TANGGAL (BUKAN MODEL GULIR LAGI!) */}
      {(
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-600" />
              Pilih Tanggal:
            </span>

            {/* Previous / Next Day Steppers */}
            <div className="inline-flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setSelectedDay(prev => Math.max(1, prev - 1))}
                disabled={selectedDay <= 1}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 disabled:opacity-30 transition-colors"
                title="Hari Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-xs font-bold text-neutral-900 dark:text-white">
                Tgl {selectedDay}
              </span>
              <button
                onClick={() => setSelectedDay(prev => Math.min(MD, prev + 1))}
                disabled={selectedDay >= MD}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 disabled:opacity-30 transition-colors"
                title="Hari Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Native HTML5 Calendar Date Input */}
            <input
              type="date"
              min={`${period.key}-01`}
              max={`${period.key}-${String(MD).padStart(2, '0')}`}
              value={currentDateIso}
              onChange={(e) => {
                const dayPart = Number(e.target.value.slice(8));
                if (dayPart >= 1 && dayPart <= MD) setSelectedDay(dayPart);
              }}
              className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono font-bold text-neutral-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />

            {/* Dropdown Select (Semua tanggal lengkap) */}
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none max-w-xs truncate"
            >
              {Array.from({ length: MD }, (_, i) => i + 1).map(d => {
                const dateObj = new Date(PY, PM0, d);
                const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
                const isSun = dateObj.getDay() === 0;
                const isToday = d === state.currentDayNum;
                return (
                  <option key={d} value={d}>
                    {d} {period.label} &bull; {dayName} {isSun ? '(Libur Minggu)' : ''} {isToday ? '★ Hari Ini' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDay(state.currentDayNum)}
              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold hover:bg-rose-100 transition-colors"
            >
              Lompat ke Hari Ini (Tgl {state.currentDayNum})
            </button>
          </div>
        </div>
      )}

      {/* TABEL 1: PER TANGGAL (DETAIL PENJUALAN HARI ITU) */}
      {(
        <div className="space-y-4">
          {/* KPI Summary Cards Hari Ini */}
          {(() => {
            const onTrackCount = state.tkus.filter(t => {
              if (!t.aktif) return false;
              const idx = state.tkus.indexOf(t);
              const rec = getRecordFor(currentDateIso, idx);
              const sold = rec?.sold ?? getTkuDailySales(idx, selectedDay, 'ALL');
              return sold >= t.targetHarian;
            }).length;
            const activeCount = state.tkus.filter(t => t.aktif).length;
            const pctCapaian = cabangSum.sold / (totalBranchTarget || 1);
            const pctBb = (cabangSum.bb + cabangSum.sold) > 0 ? cabangSum.bb / (cabangSum.bb + cabangSum.sold) : 0;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-stretch">
                <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between h-full">
                  <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                    Penjualan Hari Ini
                  </span>
                  <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    {formatNumber(cabangSum.sold)} <span className="text-xs font-sans text-neutral-400 font-normal">btl</span>
                  </p>
                  <span className="text-[10px] text-neutral-400">Tgl {selectedDay} {period.label}</span>
                </div>

                <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between h-full">
                  <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                    Target Cabang/Hari
                  </span>
                  <p className="text-xl font-bold font-mono text-neutral-900 dark:text-white">
                    {formatNumber(totalBranchTarget)} <span className="text-xs font-sans text-neutral-400 font-normal">btl</span>
                  </p>
                  <span className="text-[10px] text-neutral-400">Target harian 10 TKU</span>
                </div>

                <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between h-full">
                  <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                    % Capaian Hari Ini
                  </span>
                  <p className={`text-xl font-bold font-mono ${pctCapaian >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatPercent(pctCapaian)}
                  </p>
                  <span className="text-[10px] text-neutral-400">{cabangSum.sold >= totalBranchTarget ? 'Target Tercapai' : 'Kurang Target'}</span>
                </div>

                <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between h-full">
                  <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                    BB
                  </span>
                  <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {formatNumber(cabangSum.bb)} <span className="text-xs font-sans text-neutral-400 font-normal">btl</span>
                  </p>
                  <span className="text-[10px] text-neutral-400">Rasio: {formatPercent(pctBb)}</span>
                </div>

                <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between h-full">
                  <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                    PDM Hari Ini
                  </span>
                  <p className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
                    {formatNumber(cabangSum.pdm)} <span className="text-xs font-sans text-neutral-400 font-normal">btl</span>
                  </p>
                  <span className="text-[10px] text-neutral-400">Penjualan Drop Mitra</span>
                </div>

                <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between h-full">
                  <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                    TKU Capai Target
                  </span>
                  <p className="text-xl font-bold font-mono text-neutral-900 dark:text-white flex items-center gap-1.5">
                    <span className="text-emerald-600">{onTrackCount}</span>
                    <span className="text-neutral-400 text-sm">/ {activeCount} TKU</span>
                  </p>
                  <span className="text-[10px] text-neutral-400">Target harian masing-masing</span>
                </div>
              </div>
            );
          })()}

          {/* Tabel Penjualan Hari Ini */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span>Tabel Penjualan Hari Ini &bull; {formatDateIndo(currentDateIso)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold">
                    Tgl {selectedDay} {period.namaBulanPendek}
                  </span>
                </h2>
                <p className="text-xs text-neutral-500">
                  Data harian saja: penjualan 4 varian, capaian target, BB, PDM, absen, dan frekuensi absen pada tanggal terpilih. Akumulasinya ada di menu Breakdown & Realisasi.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-neutral-500">
                Total Cabang: {formatNumber(cabangSum.sold)} btl
              </span>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                  <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                  <th className="py-2.5 px-2 text-right font-semibold text-rose-600 dark:text-rose-400">YO</th>
                  <th className="py-2.5 px-2 text-right font-semibold text-amber-600 dark:text-amber-400">OM</th>
                  <th className="py-2.5 px-2 text-right font-semibold text-pink-600 dark:text-pink-400">OS</th>
                  <th className="py-2.5 px-2 text-right font-semibold text-sky-600 dark:text-sky-400">YT</th>
                  <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">Total Terjual</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold">Target/Hari</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold border-r border-neutral-200 dark:border-neutral-800">% Capaian</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold">BB</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold">% BB</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold">PDM</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold">Absen</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold">Frek</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold text-rose-600 border-l border-neutral-200 dark:border-neutral-700">YL &lt; 250</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold text-amber-600">YL &lt; 300</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                {/* RAYON 1 SECTION */}
                <tr className="bg-neutral-100/50 dark:bg-neutral-800/50 font-bold text-neutral-700 dark:text-neutral-300">
                  <td colSpan={15} className="py-2 px-3 font-sans">
                    RAYON 1 JEMBER
                  </td>
                </tr>
                {state.tkus.filter(t => t.rayon === 1).map(t => {
                  const idx = state.tkus.indexOf(t);
                  const rec = getRecordFor(currentDateIso, idx);
                  const v = rec?.v || [
                    getTkuDailySales(idx, selectedDay, 'YO'),
                    getTkuDailySales(idx, selectedDay, 'OM'),
                    getTkuDailySales(idx, selectedDay, 'OS'),
                    getTkuDailySales(idx, selectedDay, 'YT')
                  ];
                  const sold = rec?.sold ?? getTkuDailySales(idx, selectedDay, 'ALL');
                  const bb = rec?.bb;
                  const pctBb = (bb !== undefined && sold !== undefined && (bb + sold) > 0)
                    ? formatPercent(bb / (bb + sold))
                    : '—';
                  const pdm = rec ? ((rec.pdm ?? 0) || (rec.pdmV ? rec.pdmV.reduce((a, b) => a + b, 0) : 0)) : undefined;
                  const absen = rec?.absen;
                  const frek = rec?.frek;
                  const pctCapaianTku = t.targetHarian > 0 ? (sold || 0) / t.targetHarian : 0;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${
                        !t.aktif ? 'opacity-40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                        {t.nama} <span className="text-[10px] text-neutral-400 font-normal">R{t.rayon}</span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                        {v ? formatNumber(v[0]) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                        {v ? formatNumber(v[1]) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                        {v ? formatNumber(v[2]) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                        {v ? formatNumber(v[3]) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                        {sold !== undefined ? formatNumber(sold) : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-500">
                        {formatNumber(t.targetHarian)}
                      </td>
                      <td className={`py-2.5 px-2.5 text-right font-bold border-r border-neutral-200 dark:border-neutral-800 ${
                        pctCapaianTku >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {formatPercent(pctCapaianTku)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-600 dark:text-neutral-400">
                        {bb !== undefined ? formatNumber(bb) : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-600 dark:text-neutral-400">
                        {pctBb}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-600 dark:text-neutral-400">
                        {pdm !== undefined ? formatNumber(pdm) : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-600 dark:text-neutral-400">
                        {absen !== undefined ? absen : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-500">
                        {frek !== undefined ? frek : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-rose-600 dark:text-rose-400 border-l border-neutral-200 dark:border-neutral-700">
                        {rec?.l250 ?? t.l250 ?? 0}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                        {rec?.l300 ?? t.l300 ?? 0}
                      </td>
                    </tr>
                  );
                })}

                {/* Subtotal Rayon 1 */}
                <tr className="bg-neutral-50/90 dark:bg-neutral-800/60 font-semibold border-t-2 border-neutral-200 dark:border-neutral-700">
                  <td className="py-3 px-3 font-sans text-neutral-900 dark:text-white">Total Rayon 1</td>
                  <td className="py-3 px-2 text-right">{formatNumber(r1Sum.vTotal[0])}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(r1Sum.vTotal[1])}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(r1Sum.vTotal[2])}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(r1Sum.vTotal[3])}</td>
                  <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-white">
                    {formatNumber(r1Sum.sold)}
                  </td>
                  <td className="py-3 px-2.5 text-right font-bold text-neutral-600 dark:text-neutral-300">
                    {formatNumber(r1Target)}
                  </td>
                  <td className={`py-3 px-2.5 text-right font-bold border-r border-neutral-200 dark:border-neutral-800 ${
                    r1Sum.sold >= r1Target ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatPercent(r1Sum.sold / (r1Target || 1))}
                  </td>
                  <td className="py-3 px-2.5 text-right">{formatNumber(r1Sum.bb)}</td>
                  <td className="py-3 px-2.5 text-right">
                    {formatPercent(r1Sum.bb / ((r1Sum.bb + r1Sum.sold) || 1))}
                  </td>
                  <td className="py-3 px-2.5 text-right">{formatNumber(r1Sum.pdm)}</td>
                  <td className="py-3 px-2.5 text-right">{formatNumber(r1Sum.absen)}</td>
                  <td className="py-3 px-2.5 text-right">{formatNumber(r1Sum.frek)}</td>
                  <td className="py-3 px-2.5 text-right font-bold text-rose-600 border-l border-neutral-200 dark:border-neutral-700">{formatNumber(r1Sum.l250)}</td>
                  <td className="py-3 px-2.5 text-right font-bold text-amber-600">{formatNumber(r1Sum.l300)}</td>
                </tr>

                {/* RAYON 2 SECTION */}
                <tr className="bg-neutral-100/50 dark:bg-neutral-800/50 font-bold text-neutral-700 dark:text-neutral-300">
                  <td colSpan={15} className="py-2 px-3 font-sans">
                    RAYON 2 JEMBER
                  </td>
                </tr>
                {state.tkus.filter(t => t.rayon === 2).map(t => {
                  const idx = state.tkus.indexOf(t);
                  const rec = getRecordFor(currentDateIso, idx);
                  const v = rec?.v || [
                    getTkuDailySales(idx, selectedDay, 'YO'),
                    getTkuDailySales(idx, selectedDay, 'OM'),
                    getTkuDailySales(idx, selectedDay, 'OS'),
                    getTkuDailySales(idx, selectedDay, 'YT')
                  ];
                  const sold = rec?.sold ?? getTkuDailySales(idx, selectedDay, 'ALL');
                  const bb = rec?.bb;
                  const pctBb = (bb !== undefined && sold !== undefined && (bb + sold) > 0)
                    ? formatPercent(bb / (bb + sold))
                    : '—';
                  const pdm = rec ? ((rec.pdm ?? 0) || (rec.pdmV ? rec.pdmV.reduce((a, b) => a + b, 0) : 0)) : undefined;
                  const absen = rec?.absen;
                  const frek = rec?.frek;
                  const pctCapaianTku = t.targetHarian > 0 ? (sold || 0) / t.targetHarian : 0;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${
                        !t.aktif ? 'opacity-40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                        {t.nama} <span className="text-[10px] text-neutral-400 font-normal">R{t.rayon}</span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                        {v ? formatNumber(v[0]) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                        {v ? formatNumber(v[1]) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                        {v ? formatNumber(v[2]) : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-neutral-700 dark:text-neutral-300">
                        {v ? formatNumber(v[3]) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                        {sold !== undefined ? formatNumber(sold) : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-500">
                        {formatNumber(t.targetHarian)}
                      </td>
                      <td className={`py-2.5 px-2.5 text-right font-bold border-r border-neutral-200 dark:border-neutral-800 ${
                        pctCapaianTku >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {formatPercent(pctCapaianTku)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-600 dark:text-neutral-400">
                        {bb !== undefined ? formatNumber(bb) : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-600 dark:text-neutral-400">
                        {pctBb}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-600 dark:text-neutral-400">
                        {pdm !== undefined ? formatNumber(pdm) : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-600 dark:text-neutral-400">
                        {absen !== undefined ? absen : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-neutral-500">
                        {frek !== undefined ? frek : '—'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-rose-600 dark:text-rose-400 border-l border-neutral-200 dark:border-neutral-700">
                        {rec?.l250 ?? t.l250 ?? 0}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                        {rec?.l300 ?? t.l300 ?? 0}
                      </td>
                    </tr>
                  );
                })}

                {/* Subtotal Rayon 2 */}
                <tr className="bg-neutral-50/90 dark:bg-neutral-800/60 font-semibold">
                  <td className="py-3 px-3 font-sans text-neutral-900 dark:text-white">Total Rayon 2</td>
                  <td className="py-3 px-2 text-right">{formatNumber(r2Sum.vTotal[0])}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(r2Sum.vTotal[1])}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(r2Sum.vTotal[2])}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(r2Sum.vTotal[3])}</td>
                  <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-white">
                    {formatNumber(r2Sum.sold)}
                  </td>
                  <td className="py-3 px-2.5 text-right font-bold text-neutral-600 dark:text-neutral-300">
                    {formatNumber(r2Target)}
                  </td>
                  <td className={`py-3 px-2.5 text-right font-bold border-r border-neutral-200 dark:border-neutral-800 ${
                    r2Sum.sold >= r2Target ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatPercent(r2Sum.sold / (r2Target || 1))}
                  </td>
                  <td className="py-3 px-2.5 text-right">{formatNumber(r2Sum.bb)}</td>
                  <td className="py-3 px-2.5 text-right">
                    {formatPercent(r2Sum.bb / ((r2Sum.bb + r2Sum.sold) || 1))}
                  </td>
                  <td className="py-3 px-2.5 text-right">{formatNumber(r2Sum.pdm)}</td>
                  <td className="py-3 px-2.5 text-right">{formatNumber(r2Sum.absen)}</td>
                  <td className="py-3 px-2.5 text-right">{formatNumber(r2Sum.frek)}</td>
                  <td className="py-3 px-2.5 text-right font-bold text-rose-600 border-l border-neutral-200 dark:border-neutral-700">{formatNumber(r2Sum.l250)}</td>
                  <td className="py-3 px-2.5 text-right font-bold text-amber-600">{formatNumber(r2Sum.l300)}</td>
                </tr>

                <tr className="bg-rose-50/60 dark:bg-rose-950/30 font-bold border-t-2 border-rose-200 dark:border-rose-900/60">
                  <td className="py-3 px-3 font-sans text-rose-700 dark:text-rose-400">Total Cabang Jember</td>
                  <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatNumber(cabangSum.vTotal[0])}</td>
                  <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatNumber(cabangSum.vTotal[1])}</td>
                  <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatNumber(cabangSum.vTotal[2])}</td>
                  <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">{formatNumber(cabangSum.vTotal[3])}</td>
                  <td className="py-3 px-3 text-right font-extrabold text-rose-700 dark:text-rose-400 text-sm">
                    {formatNumber(cabangSum.sold)}
                  </td>
                  <td className="py-3 px-2.5 text-right font-extrabold text-rose-700 dark:text-rose-400">
                    {formatNumber(totalBranchTarget)}
                  </td>
                  <td className={`py-3 px-2.5 text-right font-extrabold border-r border-neutral-200 dark:border-neutral-800 ${
                    cabangSum.sold >= totalBranchTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}>
                    {formatPercent(cabangSum.sold / (totalBranchTarget || 1))}
                  </td>
                  <td className="py-3 px-2.5 text-right text-rose-700 dark:text-rose-400">{formatNumber(cabangSum.bb)}</td>
                  <td className="py-3 px-2.5 text-right text-rose-700 dark:text-rose-400">
                    {formatPercent(cabangSum.bb / ((cabangSum.bb + cabangSum.sold) || 1))}
                  </td>
                  <td className="py-3 px-2.5 text-right text-rose-700 dark:text-rose-400">{formatNumber(cabangSum.pdm)}</td>
                  <td className="py-3 px-2.5 text-right text-rose-700 dark:text-rose-400">{formatNumber(cabangSum.absen)}</td>
                  <td className="py-3 px-2.5 text-right text-rose-700 dark:text-rose-400">{formatNumber(cabangSum.frek)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

    </div>
  );
};
