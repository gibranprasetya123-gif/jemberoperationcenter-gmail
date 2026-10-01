import React, { useState } from 'react';
import { 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3, 
  Table as TableIcon, 
  FileSpreadsheet,
  Activity,
  ArrowUpRight,
  Sparkles,
  Users
} from 'lucide-react';
import { AppState } from '../types';
import { buildEvaluasiData } from '../services/evaluasi';
import { EvalFullTable } from '../components/EvalFullTable';
import { EvalMiniTable } from '../components/EvalMiniTable';
import { formatNumber, formatPercent, getPeriodInfo } from '../services/storage';

interface EvaluasiViewProps {
  state: AppState;
  onUpdateRayon: (rayon: number) => void;
}

export const EvaluasiView: React.FC<EvaluasiViewProps> = ({ state, onUpdateRayon }) => {
  const [evalMode, setEvalMode] = useState<'full' | 'mini' | 'analisa'>('full');
  const selectedRayon = state.selectedRayon; // 0: Cabang, 1: Rayon 1, 2: Rayon 2
  const period = getPeriodInfo(state);
  const day = state.currentDayNum;
  const divider = state.pembagiHari || day || 1;

  const {
    allRows,
    r1Rows,
    r2Rows,
    r1Total,
    r2Total,
    cabangTotal,
    highlights
  } = buildEvaluasiData(state);

  const displayedRows = selectedRayon === 0 
    ? allRows.filter(r => r.tku.aktif)
    : selectedRayon === 1
    ? r1Rows
    : r2Rows;

  // Sorting for performance analysis
  const sortedByPerf = [...displayedRows].sort((a, b) => b.vsTgPct - a.vsTgPct);
  const top3Tkus = sortedByPerf.slice(0, 3);
  const bottom3Tkus = [...displayedRows].sort((a, b) => a.vsTgPct - b.vsTgPct).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls Bar */}
      <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-rose-600" />
              Evaluasi &amp; Analisa Performa TKU
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-semibold">
              {period.label} (÷{divider}hr)
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Evaluasi komprehensif penjualan, ritme mingguan (vs LW), capaian target, BB, s/YL, presensi YL, cover area, dan produktivitas YL &lt; 250 / &lt; 300
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Rayon Filter */}
          <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl shrink-0">
            {[
              { id: 0, label: 'Cabang' },
              { id: 1, label: 'Rayon 1' },
              { id: 2, label: 'Rayon 2' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => onUpdateRayon(r.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedRayon === r.id
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* View Mode Switcher: Full Table vs Mini Table vs Analisa */}
          <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl shrink-0">
            <button
              onClick={() => setEvalMode('full')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                evalMode === 'full'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Full</span>
            </button>
            <button
              onClick={() => setEvalMode('mini')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                evalMode === 'mini'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Tabel Mini</span>
            </button>
            <button
              onClick={() => setEvalMode('analisa')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                evalMode === 'analisa'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ringkasan Analisa</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Grid Ringkasan Highlights Performa Terbaik (9 Card Sesuai Gambar) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {/* 1. Rata2 Tertinggi */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1 truncate">Rata2 Tertinggi</span>
          <p className="text-sm font-black font-mono text-neutral-900 dark:text-white truncate">
            {formatNumber(Math.round(highlights.topRata.val))} <span className="text-[9px] font-normal text-neutral-400">btl</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5 truncate">{highlights.topRata.name}</span>
        </div>

        {/* 2. vs LW Terbaik */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1 truncate">vs LW Terbaik</span>
          <p className="text-sm font-black font-mono text-emerald-600 truncate">
            {highlights.topLw ? formatPercent(highlights.topLw.pct) : '—'}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5 truncate">{highlights.topLw?.name || '—'}</span>
        </div>

        {/* 3. vs Target Terbaik */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1 truncate">vs Tgt Terbaik</span>
          <p className="text-sm font-black font-mono text-emerald-600 truncate">
            {formatPercent(highlights.topTg.pct)}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5 truncate">{highlights.topTg.name}</span>
        </div>

        {/* 4. vs Last Year Terbaik */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1 truncate">vs LY Terbaik</span>
          <p className="text-sm font-black font-mono text-sky-600 truncate">
            {formatPercent(highlights.topLy.pct)}
          </p>
          <span className="text-[10px] text-sky-600 font-semibold block mt-0.5 truncate">{highlights.topLy.name}</span>
        </div>

        {/* 5. % BB Terendah (0% Terbaik) */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1 truncate">% BB Terendah</span>
          <p className="text-sm font-black font-mono text-amber-600 truncate">
            {formatPercent(highlights.bestBb.pct)}
          </p>
          <span className="text-[10px] text-amber-600 font-semibold block mt-0.5 truncate">{highlights.bestBb.name}</span>
        </div>

        {/* 6. s/YL Tertinggi */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1 truncate">s/YL Tertinggi</span>
          <p className="text-sm font-black font-mono text-rose-600 truncate">
            {formatNumber(highlights.topSyl.val)}
          </p>
          <span className="text-[10px] text-rose-600 font-semibold block mt-0.5 truncate">{highlights.topSyl.name}</span>
        </div>

        {/* 7. Absen & Frek Terendah */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1 truncate">Presensi Terbaik</span>
          <p className="text-sm font-black font-mono text-emerald-600 truncate">
            {highlights.bestAbsen.abs} <span className="text-[9px] font-normal text-neutral-400">abs /</span> {highlights.bestAbsen.frk} <span className="text-[9px] font-normal text-neutral-400">frk</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5 truncate">{highlights.bestAbsen.name}</span>
        </div>

        {/* 8. Cover Area (CA) */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1 truncate">% Cover (CA)</span>
          <p className={`text-sm font-black font-mono ${highlights.bestCover.pct >= 1 ? 'text-emerald-600' : 'text-amber-600'} truncate`}>
            {formatPercent(highlights.bestCover.pct)}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5 truncate">{highlights.bestCover.name}</span>
        </div>

        {/* 9. % YL < 250 Terendah */}
        <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-1 truncate">% YL &lt; 250 Terendah</span>
          <p className="text-sm font-black font-mono text-emerald-600 truncate">
            {formatPercent(highlights.bestL250.pct)}
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5 truncate">{highlights.bestL250.name}</span>
        </div>
      </div>

      {/* 3. TAMPILAN SESUAI MODE */}
      {evalMode === 'full' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <TableIcon className="w-4 h-4 text-emerald-600" />
              Tabel Evaluasi Lengkap ({selectedRayon === 0 ? 'Seluruh Cabang' : `Rayon ${selectedRayon}`})
            </h2>
            <span className="text-[11px] text-neutral-500 font-mono">
              Total {displayedRows.length} Unit TKU &bull; Pembagi {divider} Hari
            </span>
          </div>

          <EvalFullTable
            rows={displayedRows}
            r1Rows={r1Rows}
            r2Rows={r2Rows}
            r1Total={r1Total}
            r2Total={r2Total}
            cabangTotal={cabangTotal}
            selectedRayon={selectedRayon}
            divider={divider}
          />

      {/* 3.5 Tabel Progres & Perbandingan Penjualan Mingguan (Naik - Turun Mingguan) */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Rekapitulasi Penjualan &amp; Tren Pertumbuhan Mingguan ({selectedRayon === 0 ? 'Seluruh Cabang' : `Rayon ${selectedRayon}`})
            </h3>
            <p className="text-xs text-neutral-500">
              Evaluasi total penjualan, akumulasi berjalan, rata-rata harian, serta perbandingan naik/turun vs minggu sebelumnya
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            Target Harian: {formatNumber(selectedRayon === 0 ? state.tkus.reduce((a,b)=>a+b.targetHarian, 0) : state.tkus.filter(t=>t.rayon === selectedRayon).reduce((a,b)=>a+b.targetHarian, 0))} btl/hr
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold bg-neutral-50 dark:bg-neutral-800/50">
                <th className="py-2.5 px-3">Periode</th>
                <th className="py-2.5 px-3">Rentang Tanggal</th>
                <th className="py-2.5 px-3 text-right">Penjualan Minggu Ini</th>
                <th className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-bold">Akumulasi s/d Minggu Ini</th>
                <th className="py-2.5 px-3 text-right font-bold">Rata-rata/hr</th>
                <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white border-l border-neutral-200 dark:border-neutral-700">vs Minggu Lalu (%)</th>
                <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white">Naik / Turun (btl)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
              {(() => {
                const WEEKS_DEF = [
                  { label: 'M1 (Minggu 1)', range: 'Tgl 1 – 6 Sep', start: 1, end: 6, workDays: 6, div: 6 },
                  { label: 'M2 (Minggu 2)', range: 'Tgl 8 – 13 Sep', start: 8, end: 13, workDays: 6, div: 12 },
                  { label: 'M3 (Minggu 3)', range: 'Tgl 15 – 20 Sep', start: 15, end: 20, workDays: 6, div: 18 },
                  { label: 'M4 (Minggu 4)', range: 'Tgl 22 – 27 Sep', start: 22, end: 27, workDays: 6, div: 24 },
                  { label: 'M5 (Minggu 5)', range: 'Tgl 29 – 30 Sep', start: 29, end: 30, workDays: 2, div: 26 },
                ];

                const relevantTkus = state.tkus.filter(t => t.aktif && (selectedRayon === 0 || t.rayon === selectedRayon));
                const relIdxs = relevantTkus.map(t => state.tkus.indexOf(t));
                const targetSum = relevantTkus.reduce((a, b) => a + b.targetHarian, 0);

                let runningCum = 0;
                let prevWeekSales: number | null = null;
                const rows = [];

                for (let wIdx = 0; wIdx < WEEKS_DEF.length; wIdx++) {
                  const w = WEEKS_DEF[wIdx];
                  let weekSales = 0;

                  for (let d = w.start; d <= w.end; d++) {
                    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
                    relIdxs.forEach(tIdx => {
                      const rec = state.pjd[dStr]?.[tIdx];
                      if (rec) {
                        weekSales += rec.sold || (rec.v ? rec.v.reduce((a, b) => a + b, 0) : 0);
                      } else if (d === state.currentDayNum && state.todayInputs[tIdx]) {
                        weekSales += state.todayInputs[tIdx].sold || 0;
                      } else {
                        // Fallback ke target harian terencana
                        weekSales += state.breakdown?.[tIdx]?.[d - 1] || state.tkus[tIdx].targetHarian;
                      }
                    });
                  }

                  runningCum += weekSales;
                  const avgPerDay = w.div > 0 ? runningCum / w.div : 0;
                  const vsPrevPct = prevWeekSales !== null && prevWeekSales > 0 ? (weekSales / prevWeekSales) : null;
                  const vsPrevDiff = prevWeekSales !== null ? (weekSales - prevWeekSales) : null;

                  prevWeekSales = weekSales;

                  rows.push(
                    <tr key={w.label} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="py-2.5 px-3 font-sans font-bold text-neutral-900 dark:text-neutral-100">
                        {w.label}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-neutral-500">
                        {w.range}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                        {formatNumber(weekSales)} <span className="text-[10px] font-sans text-neutral-400 font-normal">btl</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatNumber(runningCum)} <span className="text-[10px] font-sans text-neutral-400 font-normal">btl</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-neutral-800 dark:text-neutral-200">
                        {formatNumber(Math.round(avgPerDay))} <span className="text-[10px] font-sans text-neutral-400 font-normal">btl/hr</span>
                      </td>
                      <td className="py-2.5 px-3 text-right border-l border-neutral-200 dark:border-neutral-700">
                        {vsPrevPct !== null ? (
                          <span className={`font-bold ${vsPrevPct >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatPercent(vsPrevPct)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">— (Awal Bulan)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {vsPrevDiff !== null ? (
                          <span className={`font-bold ${vsPrevDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {vsPrevDiff >= 0 ? `+${formatNumber(vsPrevDiff)}` : formatNumber(vsPrevDiff)} btl
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                }

                return rows;
              })()}
            </tbody>
          </table>
        </div>
      </div>

        </div>
      )}

      {evalMode === 'mini' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Tabel Mini Ringkas ({selectedRayon === 0 ? 'Seluruh Cabang' : `Rayon ${selectedRayon}`})
            </h2>
            <span className="text-[11px] text-neutral-500 font-mono">
              Rata2 &bull; vs LW &bull; vs Tgt &bull; vs LY &bull; % BB &bull; s/YL &bull; Absen/Frek &bull; % CA &bull; % YL &lt; 250
            </span>
          </div>

          <EvalMiniTable
            r1Rows={r1Rows}
            r2Rows={r2Rows}
            r1Total={r1Total}
            r2Total={r2Total}
            cabangTotal={cabangTotal}
            selectedRayon={selectedRayon}
          />

      {/* 3.5 Tabel Progres & Perbandingan Penjualan Mingguan (Naik - Turun Mingguan) */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Rekapitulasi Penjualan &amp; Tren Pertumbuhan Mingguan ({selectedRayon === 0 ? 'Seluruh Cabang' : `Rayon ${selectedRayon}`})
            </h3>
            <p className="text-xs text-neutral-500">
              Evaluasi total penjualan, akumulasi berjalan, rata-rata harian, serta perbandingan naik/turun vs minggu sebelumnya
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            Target Harian: {formatNumber(selectedRayon === 0 ? state.tkus.reduce((a,b)=>a+b.targetHarian, 0) : state.tkus.filter(t=>t.rayon === selectedRayon).reduce((a,b)=>a+b.targetHarian, 0))} btl/hr
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold bg-neutral-50 dark:bg-neutral-800/50">
                <th className="py-2.5 px-3">Periode</th>
                <th className="py-2.5 px-3">Rentang Tanggal</th>
                <th className="py-2.5 px-3 text-right">Penjualan Minggu Ini</th>
                <th className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-bold">Akumulasi s/d Minggu Ini</th>
                <th className="py-2.5 px-3 text-right font-bold">Rata-rata/hr</th>
                <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white border-l border-neutral-200 dark:border-neutral-700">vs Minggu Lalu (%)</th>
                <th className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white">Naik / Turun (btl)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-mono">
              {(() => {
                const WEEKS_DEF = [
                  { label: 'M1 (Minggu 1)', range: 'Tgl 1 – 6 Sep', start: 1, end: 6, workDays: 6, div: 6 },
                  { label: 'M2 (Minggu 2)', range: 'Tgl 8 – 13 Sep', start: 8, end: 13, workDays: 6, div: 12 },
                  { label: 'M3 (Minggu 3)', range: 'Tgl 15 – 20 Sep', start: 15, end: 20, workDays: 6, div: 18 },
                  { label: 'M4 (Minggu 4)', range: 'Tgl 22 – 27 Sep', start: 22, end: 27, workDays: 6, div: 24 },
                  { label: 'M5 (Minggu 5)', range: 'Tgl 29 – 30 Sep', start: 29, end: 30, workDays: 2, div: 26 },
                ];

                const relevantTkus = state.tkus.filter(t => t.aktif && (selectedRayon === 0 || t.rayon === selectedRayon));
                const relIdxs = relevantTkus.map(t => state.tkus.indexOf(t));
                const targetSum = relevantTkus.reduce((a, b) => a + b.targetHarian, 0);

                let runningCum = 0;
                let prevWeekSales: number | null = null;
                const rows = [];

                for (let wIdx = 0; wIdx < WEEKS_DEF.length; wIdx++) {
                  const w = WEEKS_DEF[wIdx];
                  let weekSales = 0;

                  for (let d = w.start; d <= w.end; d++) {
                    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
                    relIdxs.forEach(tIdx => {
                      const rec = state.pjd[dStr]?.[tIdx];
                      if (rec) {
                        weekSales += rec.sold || (rec.v ? rec.v.reduce((a, b) => a + b, 0) : 0);
                      } else if (d === state.currentDayNum && state.todayInputs[tIdx]) {
                        weekSales += state.todayInputs[tIdx].sold || 0;
                      } else {
                        // Fallback ke target harian terencana
                        weekSales += state.breakdown?.[tIdx]?.[d - 1] || state.tkus[tIdx].targetHarian;
                      }
                    });
                  }

                  runningCum += weekSales;
                  const avgPerDay = w.div > 0 ? runningCum / w.div : 0;
                  const vsPrevPct = prevWeekSales !== null && prevWeekSales > 0 ? (weekSales / prevWeekSales) : null;
                  const vsPrevDiff = prevWeekSales !== null ? (weekSales - prevWeekSales) : null;

                  prevWeekSales = weekSales;

                  rows.push(
                    <tr key={w.label} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="py-2.5 px-3 font-sans font-bold text-neutral-900 dark:text-neutral-100">
                        {w.label}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-neutral-500">
                        {w.range}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                        {formatNumber(weekSales)} <span className="text-[10px] font-sans text-neutral-400 font-normal">btl</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatNumber(runningCum)} <span className="text-[10px] font-sans text-neutral-400 font-normal">btl</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-neutral-800 dark:text-neutral-200">
                        {formatNumber(Math.round(avgPerDay))} <span className="text-[10px] font-sans text-neutral-400 font-normal">btl/hr</span>
                      </td>
                      <td className="py-2.5 px-3 text-right border-l border-neutral-200 dark:border-neutral-700">
                        {vsPrevPct !== null ? (
                          <span className={`font-bold ${vsPrevPct >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatPercent(vsPrevPct)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">— (Awal Bulan)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {vsPrevDiff !== null ? (
                          <span className={`font-bold ${vsPrevDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {vsPrevDiff >= 0 ? `+${formatNumber(vsPrevDiff)}` : formatNumber(vsPrevDiff)} btl
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                }

                return rows;
              })()}
            </tbody>
          </table>
        </div>
      </div>

        </div>
      )}

      {/* 4. MODE RINGKASAN ANALISA PERFORMA */}
      {evalMode === 'analisa' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Performer vs Bottom Performer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top 3 Performers */}
            <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-emerald-200/80 dark:border-emerald-900/50 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <Award className="w-5 h-5" />
                <h3>3 Unit TKU Performa Terbaik (Top Performers)</h3>
              </div>
              <div className="space-y-2">
                {top3Tkus.map((r, i) => (
                  <div key={r.tku.id} className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-bold text-xs text-neutral-900 dark:text-white">{r.tku.nama} (Rayon {r.tku.rayon})</p>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          Rata: {formatNumber(Math.round(r.rata2))} btl/hr &bull; s/YL: {r.syl} &bull; % BB: {formatPercent(r.pctBb)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {formatPercent(r.vsTgPct)}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">vs Target</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom 3 Performers */}
            <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-rose-200/80 dark:border-rose-900/50 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <h3>3 Unit TKU Perlu Pembinaan &amp; Peningkatan</h3>
              </div>
              <div className="space-y-2">
                {bottom3Tkus.map((r, i) => (
                  <div key={r.tku.id} className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-bold text-xs text-neutral-900 dark:text-white">{r.tku.nama} (Rayon {r.tku.rayon})</p>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          Rata: {formatNumber(Math.round(r.rata2))} btl/hr &bull; YL &lt; 250: {r.l250} ({formatPercent(r.pctL250)})
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                        {formatPercent(r.vsTgPct)}
                      </span>
                      <span className="text-[10px] text-neutral-400 block">vs Target</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rangkuman Analisa Eksekutif */}
          <div className="p-6 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-600" />
              Rangkuman Analisa &amp; Rekomendasi Evaluasi Operasional
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-neutral-700 dark:text-neutral-300">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700 space-y-1.5">
                <span className="font-bold text-rose-600 dark:text-rose-400 uppercase text-[10px] tracking-wider block">1. Evaluasi Ritme &amp; Target</span>
                <p>
                  Pencapaian Cabang Jember mencapai rata-rata <strong className="font-mono">{formatNumber(Math.round(cabangTotal.rata2))} btl/hari</strong> ({formatPercent(cabangTotal.vsTgPct)} vs Target). Unit dengan tren pertumbuhan mingguan (vs LW) tertinggi dipimpin oleh <strong className="text-emerald-600">{highlights.topLw?.name || '—'}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700 space-y-1.5">
                <span className="font-bold text-amber-600 dark:text-amber-400 uppercase text-[10px] tracking-wider block">2. Mutu Operasional &amp; BB</span>
                <p>
                  Rasio Balik Botol Cabang berada di angka <strong className="font-mono">{formatPercent(cabangTotal.pctBb)}</strong>. Unit dengan kontrol botol terbersih adalah <strong className="text-amber-600">{highlights.bestBb.name}</strong> ({formatPercent(highlights.bestBb.pct)}).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700 space-y-1.5">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] tracking-wider block">3. Produktivitas &amp; YL &lt; 250</span>
                <p>
                  Total YL dengan rata-rata &lt; 250 botol/hari tercatat sebanyak <strong className="font-mono text-rose-600">{cabangTotal.l250} YL</strong> ({formatPercent(cabangTotal.pctL250)}). Perlu pendampingan khusus pada rute dan pembagian area YL tersebut.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
