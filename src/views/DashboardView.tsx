import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  Calendar, 
  Users, 
  Filter,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Target,
  MapPin,
  UserCheck,
  UserX,
  Zap,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { AppState, VARIANTS, TkuItem, DailySalesRecord } from '../types';
import { 
  formatNumber, 
  formatPercent, 
  formatDiff, 
  getStatusClass,
  getStatusBg,
  formatDateIndo,
  getPembagiHari,
  getPeriodInfo,
  getSeedDailyBranchTotal
} from '../services/storage';
import { makeUnitAxis, makeNiceAxis, formatAxisLabel } from '../services/chartAxis';
import { PembagiHariControl } from '../components/PembagiHariControl';

interface DashboardViewProps {
  state: AppState;
  onUpdateRayon: (rayon: number) => void;
  onUpdatePembagiHari?: () => void;
  onUpdateActiveDay?: (day: number) => void;
  onSwitchToTku?: (tkuIdx: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  state, 
  onUpdateRayon,
  onUpdatePembagiHari,
  onUpdateActiveDay,
  onSwitchToTku
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ day: number; val: number; bb?: number; x: number; y: number } | null>(null);
  const [tableTab, setTableTab] = useState<'penjualan' | 'operasional'>('penjualan');
  const [rankingCriteria, setRankingCriteria] = useState<'gabungan' | 'target' | 'bulanLalu' | 'tahunLalu'>('gabungan');

  const selectedRayon = state.selectedRayon; // 0: Cabang, 1: Rayon 1, 2: Rayon 2
  const day = state.currentDayNum;
  const divider = getPembagiHari(state);
  const dividerLabel = 'Tanggal Update';
  // Info bulan kerja (tidak lagi di-hard-code September 2026)
  const period = getPeriodInfo(state);
  const MD = period.daysInMonth;
  const SUNDAYS = Array.from({ length: MD }, (_, i) => i + 1).filter(x => new Date(period.year, period.monthIndex, x).getDay() === 0);

  // Filter TKUs based on selected Rayon
  const filteredTkus = state.tkus.filter(t => {
    if (!t.aktif) return false;
    if (selectedRayon === 0) return true;
    return t.rayon === selectedRayon;
  });

  // Aggregated sales totals
  const totalTarget = filteredTkus.reduce((acc, t) => acc + t.targetHarian, 0);
  const variantSums = [0, 0, 0, 0];
  let totalSold = 0;

  filteredTkus.forEach(t => {
    t.penjualanAkm.forEach((val, i) => {
      variantSums[i] += val;
      totalSold += val;
    });
  });

  const maxVariant = Math.max(1, ...variantSums);

  // Targets comparison
  const blSum = filteredTkus.reduce((acc, t) => {
    const rawIdx = state.tkus.indexOf(t);
    return acc + (state.targetBulanLalu[rawIdx] || 0);
  }, 0);

  const tySum = filteredTkus.reduce((acc, t) => {
    const rawIdx = state.tkus.indexOf(t);
    return acc + (state.targetTahunLalu[rawIdx] || 0);
  }, 0);

  // Rata-rata & Selisih
  const avgPerDay = totalSold / divider;
  const targetDiff = totalSold - totalTarget * divider;
  const targetPct = avgPerDay / (totalTarget || 1);

  const blDiff = totalSold - blSum * divider;
  const blPct = avgPerDay / (blSum || 1);

  const tyDiff = totalSold - tySum * divider;
  const tyPct = avgPerDay / (tySum || 1);

  // 1. Area & Yakult Lady (YL) & Coverage Area
  const totalArea = filteredTkus.reduce((a, t) => a + (t.jumlahArea || 10), 0);
  const totalYl = filteredTkus.reduce((a, t) => a + (t.jumlahYl || 10), 0);
  const coverageAreaPct = totalArea > 0 ? (totalYl / totalArea) : 1;
  const vacantArea = Math.max(0, totalArea - totalYl);

  // 2. Presensi & Absensi YL & Akumulasi JWP terupdate dari pjd dan todayInputs
  let totalAbsenSpreadsheet = 0;
  let totalFrekSpreadsheet = 0;
  let totalJwpSpreadsheet = 0;

  filteredTkus.forEach(t => {
    const rawIdx = state.tkus.indexOf(t);
    let lastRec: DailySalesRecord | null = null;
    let tkuAbsen = 0;
    let tkuFrek = 0;

    for (let d = 1; d <= day; d++) {
      const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
      const rec = state.pjd[dStr]?.[rawIdx] || (d === day ? state.todayInputs[rawIdx] : null);
      if (rec) {
        tkuAbsen += rec.absen || 0;
        tkuFrek += rec.frek || 0;
        lastRec = rec;
      }
    }

    const tkuYl = lastRec?.yl || t.jumlahYl || 10;
    const effectiveTkuJwp = (lastRec?.jwpm !== undefined && lastRec.jwpm > 0)
      ? lastRec.jwpm
      : (lastRec?.jwp !== undefined && lastRec.jwp > 0)
      ? lastRec.jwp
      : (t.akmJwp !== undefined && t.akmJwp > 0)
      ? t.akmJwp
      : (tkuYl * day);

    // Gunakan nilai maksimum dari log harian dan baseline TKU agar data presensi & JWP spreadsheet tidak hilang
    const finalTkuAbsen = Math.max(tkuAbsen, t.absenYl || 0);
    const finalTkuFrek = Math.max(tkuFrek, t.frekuensiAbsen || 0);

    totalAbsenSpreadsheet += finalTkuAbsen;
    totalFrekSpreadsheet += finalTkuFrek;
    totalJwpSpreadsheet += effectiveTkuJwp;
  });

  const hadirYl = Math.max(0, totalYl - totalAbsenSpreadsheet);
  const kehadiranPct = totalYl > 0 ? (hadirYl / totalYl) : 1;
  const avgJwpPerDay = divider > 0 ? Math.round(totalJwpSpreadsheet / divider) : 0;
  const ewpPct = totalJwpSpreadsheet > 0 ? (totalFrekSpreadsheet / totalJwpSpreadsheet) * 100 : 0;

  // 3. Akumulasi BB
  let totalAkmBb = 0;
  let todayBb = 0;
  for (let d = 1; d <= day; d++) {
    const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
    const dayMap = state.pjd[dStr] || {};
    filteredTkus.forEach(t => {
      const rawIdx = state.tkus.indexOf(t);
      const rec = dayMap[rawIdx];
      const recBb = rec?.bb !== undefined ? rec.bb : (d === day ? (state.todayInputs[rawIdx]?.bb || 0) : 0);
      totalAkmBb += recBb;
      if (d === day) {
        todayBb += (state.todayInputs[rawIdx]?.bb || rec?.bb || 0);
      }
    });
  }

  // Fallback / pembanding BB: pastikan mengambil akumulasi bbAkm dari TKU (total cabang = 55.295)
  const baseTkuBbSum = filteredTkus.reduce((sum, t) => {
    const bbArr = t.bbAkm || [0, 0, 0, 0];
    return sum + (bbArr[0] + bbArr[1] + bbArr[2] + bbArr[3]);
  }, 0);

  if (totalAkmBb < baseTkuBbSum) {
    totalAkmBb = baseTkuBbSum;
  }

  const bbPercent = totalSold > 0 ? (totalAkmBb / totalSold) : 0;
  const avgBbPerDay = totalAkmBb / divider;
  const totalAkmPdm = totalSold + totalAkmBb;
  const avgPdmPerDay = divider > 0 ? (totalAkmPdm / divider) : 0;

  // 4. Produktivitas s/YL per JWP (JWP)
  const totalL250 = filteredTkus.reduce((a, t) => a + (t.l250 ?? 0), 0);
  const totalL300 = filteredTkus.reduce((a, t) => a + (t.l300 ?? 0), 0);
  const pctTotalL250 = totalYl > 0 ? totalL250 / totalYl : 0;
  const pctTotalL300 = totalYl > 0 ? totalL300 / totalYl : 0;
  const sylVal = totalJwpSpreadsheet > 0 ? (totalSold / totalJwpSpreadsheet) : 0;
  const botolPerYlPerHari = totalYl > 0 ? (avgPerDay / totalYl) : 0;

  // Daily points calculation for Chart
  const r1TodaySold = [0, 1, 2, 3, 4].reduce((a, idx) => a + (state.todayInputs[idx]?.sold || 0), 0);
  const r2TodaySold = [5, 6, 7, 8, 9].reduce((a, idx) => a + (state.todayInputs[idx]?.sold || 0), 0);
  const cabangTodaySold = r1TodaySold + r2TodaySold;
  const todaySoldForView = selectedRayon === 1 ? r1TodaySold : selectedRayon === 2 ? r2TodaySold : cabangTodaySold;

  const getRayonRatio = (d: number, rayon: number): number => {
    if (rayon === 0) return 1.0;
    let r1Ratio = 0.4803;
    if (d >= 8 && d <= 14) r1Ratio = 0.5079;
    else if (d >= 15 && d <= 21) r1Ratio = 0.4777;
    else if (d >= 22) r1Ratio = 0.4250;
    return rayon === 1 ? r1Ratio : (1 - r1Ratio);
  };

  const dailyPoints: { day: number; val: number }[] = [];
  for (let d = 1; d <= day; d++) {
    let val = 0;
    if (d < day) {
      const baseCabang = getSeedDailyBranchTotal(state, d);
      if (selectedRayon === 0) {
        val = baseCabang;
      } else {
        val = baseCabang > 0 ? Math.round(baseCabang * getRayonRatio(d, selectedRayon)) : 0;
      }
    } else {
      val = todaySoldForView;
    }
    dailyPoints.push({ day: d, val });
  }

  const activeYear = period.year;
  const activeMonth = period.monthIndex;

  // Day Multiplier Calculation
  // For Monday or after holiday/no transaction: multiplier counts consecutive non-transaction days + 1.
  // Looks back across the month boundary into previous month (e.g. Day 1 is Monday -> Sunday prev month was off -> multiplier is 2).
  const getDayMultiplier = (d: number): number => {
    const curDate = new Date(activeYear, activeMonth, d);
    if (curDate.getDay() === 0) return 0; // Holiday (Sunday)

    let skipped = 0;
    for (let step = 1; step <= 7; step++) {
      const prevDate = new Date(activeYear, activeMonth, d - step);
      const prevIsSun = prevDate.getDay() === 0;

      if (d - step >= 1) {
        const prevD = d - step;
        let prevVal = 0;
        if (prevD < day) {
          prevVal = getSeedDailyBranchTotal(state, prevD);
        } else if (prevD === day) {
          prevVal = todaySoldForView;
        }

        if (prevIsSun || prevVal === 0) {
          skipped++;
        } else {
          break;
        }
      } else {
        // Across month boundary into previous month
        if (prevIsSun) {
          skipped++;
        } else {
          // Working day in previous month
          break;
        }
      }
    }
    return skipped + 1;
  };

  // SVG Chart Geometry
  const chartWidth = 820;
  const chartHeight = 490;
  const padLeft = 52;
  const padRight = 30;
  const graphWidth = chartWidth - padLeft - padRight;
  const xInset = 14; // jarak tgl 1 dari garis sumbu Y
  const stepX = (graphWidth - 2 * xInset) / Math.max(1, MD - 1);

  // Active contiguous day segments (excluding Sundays) for drawing trend reference polylines
  const activeSegments: number[][] = [];
  let currentActSeg: number[] = [];
  for (let d = 1; d <= MD; d++) {
    const isSun = new Date(period.year, period.monthIndex, d).getDay() === 0;
    if (!isSun) {
      currentActSeg.push(d);
    } else {
      if (currentActSeg.length > 0) {
        activeSegments.push(currentActSeg);
        currentActSeg = [];
      }
    }
  }
  if (currentActSeg.length > 0) {
    activeSegments.push(currentActSeg);
  }

  const maxDayVal = Math.max(
    ...dailyPoints.map(p => p.val),
    totalTarget * 2.2,
    blSum * 2.2,
    tySum * 2.2,
    1
  );
  const maxValForScale = selectedRayon === 0 
    ? Math.max(80000, maxDayVal * 1.08)
    : Math.max(42000, maxDayVal * 1.12);

  const getX = (d: number) => padLeft + xInset + (d - 1) * stepX;
  const getY = (v: number) => 330 - axis.scale(v) * 300;

  const bbMultiplier = selectedRayon === 1 ? 0.45 : selectedRayon === 2 ? 0.55 : 1.0;
  const bbMap = state.bbHarian;
  // Dua panel bertumpuk, sumbu X sama: penjualan (atas, kelipatan 5k) & BB (bawah, sumbu Y sendiri)
  const axis = makeUnitAxis(maxValForScale, 300, 5000);
  const gridValues = axis.ticks;
  const bbShownMax = Math.max(
    0,
    ...Object.keys(bbMap).map(Number).filter(d => d <= MD).map(d => Math.round((bbMap[d] || 0) * bbMultiplier))
  );
  const bbUsable = 100; // tinggi pakai panel BB (sisanya jarak atas agar label tidak bertabrakan)
  const bbAxis = makeNiceAxis(bbShownMax, bbUsable);
  const plotTop = 30;
  const salesBottom = 330;
  const plotBottom = 450;

  const segments: [number, number][][] = [];
  let currentSegment: [number, number][] = [];

  dailyPoints.forEach(({ day: d, val: v }) => {
    if (v > 0) {
      currentSegment.push([d, v]);
    } else {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }
  });
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // TKU Ranking rows with 3 targets + combined average ranking
  const rankedTkus = [...filteredTkus].map(t => {
    const rawIdx = state.tkus.indexOf(t);
    const akm = t.penjualanAkm.reduce((a, b) => a + b, 0);
    const avg = akm / divider;

    const tg = t.targetHarian;
    const diffTg = akm - tg * divider;
    const pctTg = tg > 0 ? avg / tg : 0;

    const bl = state.targetBulanLalu[rawIdx] || 0;
    const diffBl = akm - bl * divider;
    const pctBl = bl > 0 ? avg / bl : 0;

    const ty = state.targetTahunLalu[rawIdx] || 0;
    const diffTy = akm - ty * divider;
    const pctTy = ty > 0 ? avg / ty : 0;

    const validCount = (tg > 0 ? 1 : 0) + (bl > 0 ? 1 : 0) + (ty > 0 ? 1 : 0) || 1;
    const pctGabungan = (pctTg + pctBl + pctTy) / validCount;

    // Operational metrics per TKU
    const inp = state.todayInputs[rawIdx];
    const area = t.jumlahArea || 10;
    const yl = t.jumlahYl || 10;
    const cover = area > 0 ? (yl / area) : 1;
    const abs = inp?.absen !== undefined ? inp.absen : (t.absenYl !== undefined ? t.absenYl : 0);
    const frk = inp?.frek !== undefined ? inp.frek : (t.frekuensiAbsen !== undefined ? t.frekuensiAbsen : 0);
    const jwp = inp?.jwp !== undefined ? inp.jwp : (t.akmJwp !== undefined ? t.akmJwp : (yl * 26));
    const s_yl = jwp > 0 ? Math.round(akm / jwp) : (t.sYl || 0);

    // Hitung akumulasi BB dan % BB untuk TKU ini
    let tkuAkmBb = 0;
    for (let d = 1; d <= day; d++) {
      const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
      const rec = state.pjd[dStr]?.[rawIdx];
      const recBb = rec?.bb !== undefined ? rec.bb : (d === day ? (state.todayInputs[rawIdx]?.bb || 0) : 0);
      tkuAkmBb += recBb;
    }
    if (tkuAkmBb === 0) {
      const tkuShare = (t.jumlahYl || 10) / (totalYl || 10);
      for (let d = 1; d <= day; d++) {
        tkuAkmBb += Math.round((state.bbHarian[d] || 0) * tkuShare);
      }
    }
    const pctBb = (akm + tkuAkmBb) > 0 ? (tkuAkmBb / (akm + tkuAkmBb)) : 0;

    return {
      t,
      rawIdx,
      akm,
      avg,
      akmBb: tkuAkmBb,
      pctBb,
      tg,
      diffTg,
      pctTg,
      bl,
      diffBl,
      pctBl,
      ty,
      diffTy,
      pctTy,
      pctGabungan,
      area,
      yl,
      cover,
      abs,
      frk,
      jwp,
      s_yl,
      l250: inp?.l250 ?? t.l250 ?? 0,
      l300: inp?.l300 ?? t.l300 ?? 0,
      pctL250: yl > 0 ? (inp?.l250 ?? t.l250 ?? 0) / yl : 0,
      pctL300: yl > 0 ? (inp?.l300 ?? t.l300 ?? 0) / yl : 0
    };
  }).sort((a, b) => {
    if (rankingCriteria === 'target') return b.pctTg - a.pctTg;
    if (rankingCriteria === 'bulanLalu') return b.pctBl - a.pctBl;
    if (rankingCriteria === 'tahunLalu') return b.pctTy - a.pctTy;
    return b.pctGabungan - a.pctGabungan;
  });

  const getActivePct = (row: typeof rankedTkus[0]) => {
    if (rankingCriteria === 'target') return row.pctTg;
    if (rankingCriteria === 'bulanLalu') return row.pctBl;
    if (rankingCriteria === 'tahunLalu') return row.pctTy;
    return row.pctGabungan;
  };

  const maxRankPct = Math.max(1, ...rankedTkus.map(r => getActivePct(r)));

  return (
    <div className="space-y-6">
      {/* Top Bar with Segmented Rayon Controls & Pemilih Akun */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Dashboard Operasional & Evaluasi Penjualan
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Tanggal: {formatDateIndo(state.activeDate)} &bull; Cabang Jember ({filteredTkus.length} Unit Aktif)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown Pemilih Akun: Admin atau Unit TKU */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-neutral-500 hidden sm:inline">Pilih Unit / Akun:</label>
            <select
              value="admin"
              onChange={(e) => {
                const val = e.target.value;
                if (val !== 'admin' && onSwitchToTku) {
                  onSwitchToTku(Number(val));
                }
              }}
              aria-label="Pilih Akun Admin atau Unit TKU"
              className="text-xs font-bold px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer shadow-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <optgroup label="Akses Manajemen">
                <option value="admin">⭐ Mode Admin (Cabang & Rayon)</option>
              </optgroup>
              <optgroup label="Daftar Unit TKU">
                {state.tkus.map((t, idx) => (
                  <option key={idx} value={idx}>
                    {t.nama} (R{t.rayon})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Rayon Selector */}
          <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm shrink-0">
            {[
              { id: 0, label: 'Cabang' },
              { id: 1, label: 'Rayon 1' },
              { id: 2, label: 'Rayon 2' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => onUpdateRayon(r.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedRayon === r.id
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KARTU TERPADU: PERFORMA PENJUALAN & KONDISI OPERASIONAL */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 md:p-6 space-y-6">
        {/* Header Kartu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-base md:text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span>Rangkuman Penjualan & Kondisi Operasional</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Tanggal: {formatDateIndo(state.activeDate)} &bull; Capaian target penjualan dan indikator operasional YL
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs px-2.5 py-1.5 rounded-xl font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
              {selectedRayon === 0 ? 'Seluruh Cabang' : `Rayon ${selectedRayon}`}
            </span>
          </div>
        </div>

        {/* Bagian 1: Performa Penjualan & Capaian Target */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-3">
            1. Performa Penjualan & Capaian Target
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1.1 Akumulasi Penjualan */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-medium text-neutral-500 block mb-1">Akumulasi Penjualan</span>
                <div className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100">
                  {formatNumber(totalSold)} <span className="text-xs font-sans font-normal text-neutral-400">btl</span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex items-center justify-between">
                <span className="text-neutral-500">Rata-rata / hari</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatNumber(avgPerDay)} btl
                </span>
              </div>
            </div>

            {/* 1.2 vs Target Bulan Ini */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-neutral-500 mb-1">
                  <span className="text-xs font-medium">Capaian vs Target</span>
                  <Target className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <div className={`text-2xl font-bold font-mono tracking-tight ${getStatusClass(targetDiff)}`}>
                  {formatPercent(targetPct)}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex items-center justify-between">
                <span className="text-neutral-500">Target: {formatNumber(totalTarget)}/hr</span>
                <span className={`font-mono font-bold ${getStatusClass(targetDiff)}`}>
                  {formatDiff(targetDiff)} btl
                </span>
              </div>
            </div>

            {/* 1.3 vs Bulan Lalu */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-neutral-500 mb-1">
                  <span className="text-xs font-medium">vs Bulan Lalu (LM)</span>
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <div className={`text-2xl font-bold font-mono tracking-tight ${getStatusClass(blDiff)}`}>
                  {formatPercent(blPct)}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex items-center justify-between">
                <span className="text-neutral-500">LM: {formatNumber(blSum)}/hr</span>
                <span className={`font-mono font-bold ${getStatusClass(blDiff)}`}>
                  {formatDiff(blDiff)} btl
                </span>
              </div>
            </div>

            {/* 1.4 vs Tahun Lalu */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-neutral-500 mb-1">
                  <span className="text-xs font-medium">vs Tahun Lalu (LY)</span>
                  <Award className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <div className={`text-2xl font-bold font-mono tracking-tight ${getStatusClass(tyDiff)}`}>
                  {formatPercent(tyPct)}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs flex items-center justify-between">
                <span className="text-neutral-500">LY: {formatNumber(tySum)}/hr</span>
                <span className={`font-mono font-bold ${getStatusClass(tyDiff)}`}>
                  {formatDiff(tyDiff)} btl
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bagian 2: Kondisi Operasional (6 Kolom Lengkap) */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-3">
            2. Kondisi Operasional (Absensi, JWP, S/YL, PDM)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono">
            {/* 2.1 Jumlah YL */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
              <span className="text-[11px] font-sans text-neutral-500 block mb-1">Jumlah YL</span>
              <span className="text-base md:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {totalYl} <span className="text-xs font-normal text-neutral-400 font-sans">/ {totalArea} area</span>
              </span>
              <span className="text-[10px] text-neutral-400 block mt-1 font-sans">
                Cover: {formatPercent(coverageAreaPct)} {vacantArea > 0 ? `(${vacantArea} kosong)` : ''}
              </span>
            </div>

            {/* 2.2 Absensi (Absen dulu, baru Freq) */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
              <span className="text-[11px] font-sans text-neutral-500 block mb-1">Absensi</span>
              <span className="text-base md:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {totalAbsenSpreadsheet} <span className="text-xs font-normal text-neutral-400 font-sans">absen</span>
              </span>
              <span className="text-[10px] text-neutral-600 dark:text-neutral-300 block mt-1 font-sans">
                Freq: <strong className="text-neutral-900 dark:text-neutral-100 font-mono font-bold">{totalFrekSpreadsheet}</strong> kali
              </span>
            </div>

            {/* 2.3 Akumulasi JWP (dengan EWP di bawahnya) */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
              <span className="text-[11px] font-sans text-neutral-500 block mb-1">Akumulasi JWP</span>
              <span className="text-base md:text-lg font-bold text-sky-600 dark:text-sky-400">
                {formatNumber(totalJwpSpreadsheet)}
              </span>
              <span className="text-[10px] text-neutral-600 dark:text-neutral-300 block mt-1 font-sans">
                EWP: <strong className="text-neutral-900 dark:text-neutral-100 font-mono font-bold">{ewpPct.toFixed(1)}%</strong> ({totalFrekSpreadsheet}÷{formatNumber(totalJwpSpreadsheet)})
              </span>
            </div>

            {/* 2.4 s/YL (340: Akm Pjl / Akm JWP, 299 dihapus) */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
              <span className="text-[11px] font-sans text-neutral-500 block mb-1">s/YL</span>
              <span className="text-base md:text-lg font-bold text-rose-600 dark:text-rose-400">
                {sylVal > 0 ? formatNumber(Math.round(sylVal)) : '—'} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-1 font-sans">
                Akm Pjl &divide; Akm JWP
              </span>
            </div>

            {/* 2.5 Akumulasi PDM */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
              <span className="text-[11px] font-sans text-neutral-500 block mb-1">Akm PDM</span>
              <span className="text-base md:text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {formatNumber(totalAkmPdm)} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
              </span>
              <span className="text-[10px] text-neutral-400 block mt-1 font-sans">
                Rata: {formatNumber(Math.round(avgPdmPerDay))} btl/hr
              </span>
            </div>

            {/* 2.6 Akumulasi BB */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-800">
              <span className="text-[11px] font-sans text-neutral-500 block mb-1">Akm BB</span>
              <span className="text-base md:text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {formatNumber(totalAkmBb)} <span className="text-xs font-normal text-neutral-400 font-sans">btl</span>
              </span>
              <span className="text-[10px] text-neutral-400 block mt-1 font-sans">
                Rasio BB: {formatPercent(bbPercent)}
              </span>
            </div>
            {/* 2.7 YL < 250 */}
            <div className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
              <span className="text-[11px] font-sans text-rose-700 dark:text-rose-400 font-medium block mb-1">YL &lt; 250</span>
              <span className="text-base md:text-lg font-bold text-rose-700 dark:text-rose-400">
                {totalL250} <span className="text-xs font-normal text-rose-500 font-sans">YL</span>
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block mt-1 font-sans">
                Rasio: {formatPercent(pctTotalL250)}
              </span>
            </div>
            {/* 2.8 YL < 300 */}
            <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
              <span className="text-[11px] font-sans text-amber-700 dark:text-amber-400 font-medium block mb-1">YL &lt; 300</span>
              <span className="text-base md:text-lg font-bold text-amber-700 dark:text-amber-400">
                {totalL300} <span className="text-xs font-normal text-amber-500 font-sans">YL</span>
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-1 font-sans">
                Rasio: {formatPercent(pctTotalL300)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Variant Composition Grid */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden p-5">
        <div className="mb-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Komposisi per Varian ({selectedRayon === 0 ? 'Cabang' : `Rayon ${selectedRayon}`})
          </h2>
          <p className="text-xs text-neutral-500">Distribusi produk, rata-rata harian, dan rasio peredaran botol</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                <th className="py-2.5 px-4 font-semibold">Varian Produk</th>
                <th className="py-2.5 px-4 text-right font-semibold">Akumulasi</th>
                <th className="py-2.5 px-4 text-right font-semibold" title={`Rata-rata dihitung dengan pembagi ${divider} hari (${dividerLabel})`}>
                  Rata-rata/hari (÷{divider}hr)
                </th>
                <th className="py-2.5 px-4 text-right font-semibold">Porsi</th>
                <th className="py-2.5 px-4 font-semibold w-1/3">Diagram Rasio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
              {VARIANTS.map((v, idx) => {
                const val = variantSums[idx];
                const avg = val / divider;
                const portion = val / (totalSold || 1);
                const widthPct = (val / maxVariant) * 100;
                return (
                  <tr key={v.code} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs" style={{ color: v.color }}>
                          {v.code}
                        </span>
                        <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                          {v.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatNumber(val)}
                    </td>
                    <td className="py-3 px-4 text-right text-neutral-600 dark:text-neutral-300">
                      {formatNumber(avg)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                      {formatPercent(portion)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: v.color
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Sales Trend SVG Chart */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Tren Penjualan Harian & Balik Botol &bull; {selectedRayon === 0 ? 'Cabang' : `Rayon ${selectedRayon}`}
            </h2>
            <p className="text-xs text-neutral-500">
              Garis merah: Penjualan riil &bull; Garis putus-putus: Target (putih/hitam), LM (kuning), LY (biru) &bull; Batang pink: BB &bull; Penjualan (atas) dan BB (bawah) punya sumbu Y sendiri, tanggal sama
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-600 rounded-full inline-block" />
              <span className="text-neutral-600 dark:text-neutral-300">Penjualan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-neutral-900 dark:bg-white rounded-full inline-block border-b border-dashed border-neutral-900 dark:border-white" />
              <span className="text-neutral-600 dark:text-neutral-300">Target ({formatNumber(totalTarget)}/hr)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#eab308] rounded-full inline-block border-b border-dashed border-[#eab308]" />
              <span className="text-neutral-600 dark:text-neutral-300">LM ({formatNumber(blSum)}/hr)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#3b82f6] rounded-full inline-block border-b border-dashed border-[#3b82f6]" />
              <span className="text-neutral-600 dark:text-neutral-300">LY ({formatNumber(tySum)}/hr)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#ec4899] rounded inline-block" />
              <span className="text-neutral-600 dark:text-neutral-300">BB</span>
            </div>
          </div>
        </div>

        {/* The SVG Container */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full min-w-[760px] h-auto bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200 dark:border-neutral-800"
          >
            {/* Sunday vertical shaded markers (Libur Operasional) */}
            {SUNDAYS.map(sunDay => (
              <g key={`sun-band-${sunDay}`}>
                <rect
                  x={getX(sunDay) - 7}
                  y={30}
                  width={14}
                  height={420}
                  fill="currentColor"
                  className="text-neutral-200/50 dark:text-neutral-800/60 pointer-events-none"
                  rx={2}
                />
                <text
                  x={getX(sunDay)}
                  y={24}
                  fontSize="8"
                  textAnchor="middle"
                  className="fill-rose-500 font-semibold"
                >
                  Libur
                </text>
              </g>
            ))}

            {/* Grid Lines with Y-Axis Values */}
            {gridValues.map(gridVal => (
              <g key={gridVal}>
                <line
                  x1={padLeft}
                  x2={chartWidth - padRight}
                  y1={getY(gridVal)}
                  y2={getY(gridVal)}
                  stroke="currentColor"
                  className="text-neutral-200 dark:text-neutral-700/60"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 6}
                  y={getY(gridVal) + 3}
                  fontSize="9"
                  textAnchor="end"
                  className="fill-neutral-400 font-mono"
                >
                  {axis.showLabel(gridVal) ? formatAxisLabel(gridVal) : ''}
                </text>
              </g>
            ))}

            {/* Panel BB (bawah): garis bantu & label sumbu Y sendiri */}
            {bbAxis.ticks.map(tv => (
              <g key={`bb-${tv}`}>
                <line x1={padLeft} x2={chartWidth - padRight} y1={plotBottom - bbAxis.scale(tv) * bbUsable} y2={plotBottom - bbAxis.scale(tv) * bbUsable} stroke="currentColor" className="text-neutral-200 dark:text-neutral-700/60" strokeDasharray="3 3" />
                <text x={padLeft - 6} y={plotBottom - bbAxis.scale(tv) * bbUsable + 3} fontSize="9" textAnchor="end" fill="#ec4899" className="font-mono">
                  {bbAxis.showLabel(tv) ? formatAxisLabel(tv) : ''}
                </text>
              </g>
            ))}

            {/* Sumbu X (dasar), pemisah panel & sumbu Y */}
            <line x1={padLeft} x2={chartWidth - padRight} y1={salesBottom} y2={salesBottom} stroke="currentColor" className="text-neutral-400 dark:text-neutral-500" />
            <line x1={padLeft} x2={chartWidth - padRight} y1={plotBottom} y2={plotBottom} stroke="currentColor" className="text-neutral-400 dark:text-neutral-500" />
            <line x1={padLeft} x2={padLeft} y1={plotTop} y2={plotBottom} stroke="currentColor" className="text-neutral-400 dark:text-neutral-500" />
            <text x={padLeft - 6} y={salesBottom + 3} fontSize="9" textAnchor="end" className="fill-neutral-400 font-mono">0</text>
            <text x={padLeft - 6} y={plotBottom + 3} fontSize="9" textAnchor="end" fill="#ec4899" className="font-mono">0</text>
            <text x={padLeft - 6} y={18} fontSize="9" textAnchor="end" className="fill-neutral-500 font-semibold">Penjualan (btl)</text>
            <text x={padLeft + 8} y={salesBottom + 13} fontSize="9" textAnchor="start" fill="#ec4899" className="font-semibold">Balik Botol (btl)</text>

            {/* Target Line (White in Dark Mode, Black in Light Mode) */}
            {totalTarget > 0 && activeSegments.map((seg, sIdx) => {
              const pts = seg.map(d => `${getX(d)},${getY(totalTarget * getDayMultiplier(d))}`).join(' ');
              return (
                <polyline
                  key={`tgt-seg-${sIdx}`}
                  points={pts}
                  fill="none"
                  stroke="currentColor"
                  className="text-neutral-900 dark:text-white"
                  strokeWidth="1.75"
                  strokeDasharray="5 4"
                />
              );
            })}

            {/* Bulan Lalu (LM) Line (Yellow) */}
            {blSum > 0 && activeSegments.map((seg, sIdx) => {
              const pts = seg.map(d => `${getX(d)},${getY(blSum * getDayMultiplier(d))}`).join(' ');
              return (
                <polyline
                  key={`lm-seg-${sIdx}`}
                  points={pts}
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="1.6"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Tahun Lalu (LY) Line (Blue) */}
            {tySum > 0 && activeSegments.map((seg, sIdx) => {
              const pts = seg.map(d => `${getX(d)},${getY(tySum * getDayMultiplier(d))}`).join(' ');
              return (
                <polyline
                  key={`ly-seg-${sIdx}`}
                  points={pts}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.6"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Balik Botol Bars at the bottom (Pink) */}
            {Object.keys(bbMap).map(dStr => {
              const dNum = Number(dStr);
              if (dNum > MD) return null;
              const val = Math.round((bbMap[dNum] || 0) * bbMultiplier);
              const barHeight = bbAxis.scale(val) * bbUsable;
              const barX = getX(dNum) - 6;
              const barY = plotBottom - barHeight;
              return (
                <g key={`bb-${dNum}`}>
                  <rect
                    x={barX}
                    y={barY}
                    width={12}
                    height={Math.max(val > 0 ? 2 : 0, barHeight)}
                    fill="#ec4899"
                    className="hover:fill-pink-600 transition-colors cursor-pointer opacity-60"
                    rx={2}
                    onMouseEnter={() => setHoveredPoint({ day: dNum, val: dailyPoints[dNum - 1]?.val || 0, bb: val, x: getX(dNum), y: barY })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              );
            })}

            {/* Sales Trend Polylines */}
            {segments.map((seg, sIdx) => {
              const pointsStr = seg.map(([d, v]) => `${getX(d)},${getY(v)}`).join(' ');
              return (
                <g key={`seg-${sIdx}`}>
                  <polyline
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsStr}
                  />
                  {seg.map(([d, v]) => (
                    <circle
                      key={`pt-${d}`}
                      cx={getX(d)}
                      cy={getY(v)}
                      r={d === day ? 5 : 3.5}
                      fill={d === day ? '#be123c' : '#e11d48'}
                      stroke="#fff"
                      strokeWidth={1.5}
                      className="cursor-pointer hover:r-6 transition-all"
                      onMouseEnter={() => setHoveredPoint({ day: d, val: v, bb: bbMap[d], x: getX(d), y: getY(v) })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </g>
              );
            })}

            {/* X-axis date labels: ALL dates from 1 to 30 */}
            {Array.from({ length: MD }, (_, i) => i + 1).map(d => {
              const isSun = SUNDAYS.includes(d);
              const isCurrentToday = d === day;
              return (
                <g key={`lbl-${d}`}>
                  {isCurrentToday && (
                    <circle
                      cx={getX(d)}
                      cy={470}
                      r={7.5}
                      fill="#be123c"
                      opacity={0.15}
                    />
                  )}
                  <text
                    x={getX(d)}
                    y={473}
                    fontSize={isCurrentToday ? "9" : "8"}
                    textAnchor="middle"
                    className={`font-mono ${
                      isCurrentToday
                        ? 'fill-rose-600 font-extrabold'
                        : isSun
                        ? 'fill-rose-500 font-bold'
                        : 'fill-neutral-600 dark:fill-neutral-400 font-medium'
                    }`}
                  >
                    {d}
                  </text>
                </g>
              );
            })}

          </svg>

          {/* Interactive Tooltip */}
          {hoveredPoint && (() => {
            const mult = getDayMultiplier(hoveredPoint.day);
            const curTarget = totalTarget * (mult > 0 ? mult : 1);
            const curLM = blSum * (mult > 0 ? mult : 1);
            const curLY = tySum * (mult > 0 ? mult : 1);
            const isSun = SUNDAYS.includes(hoveredPoint.day);
            const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            const dayName = dayNames[new Date(period.year, period.monthIndex, hoveredPoint.day).getDay()];

            return (
              <div
                className="absolute z-20 pointer-events-none p-3 rounded-xl bg-neutral-900/95 text-white text-xs shadow-xl border border-neutral-700 font-mono space-y-1.5 backdrop-blur-sm min-w-[210px]"
                style={{
                  left: `${Math.min(hoveredPoint.x + 10, chartWidth - 220)}px`,
                  top: `${Math.max(10, hoveredPoint.y - 75)}px`
                }}
              >
                <div className="flex items-center justify-between font-bold text-rose-300 font-sans text-xs pb-1 border-b border-neutral-800">
                  <span>{dayName}, {hoveredPoint.day} {period.namaBulanPendek} {isSun ? '(Libur)' : ''}</span>
                  {mult > 1 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-semibold">
                      Pengali ×{mult}
                    </span>
                  )}
                </div>
                <div className="text-white flex justify-between">
                  <span className="text-neutral-400 font-sans">Realisasi:</span>
                  <span className="font-bold text-rose-400">{hoveredPoint.val > 0 ? `${formatNumber(hoveredPoint.val)} btl` : '0 btl'}</span>
                </div>
                {!isSun && totalTarget > 0 && (
                  <div className="text-neutral-100 flex justify-between">
                    <span className="text-neutral-400 font-sans">Target {mult > 1 ? `(×${mult})` : ''}:</span>
                    <span className="font-bold">{formatNumber(curTarget)} btl</span>
                  </div>
                )}
                {!isSun && blSum > 0 && (
                  <div className="text-yellow-400 flex justify-between">
                    <span className="text-neutral-400 font-sans">LM {mult > 1 ? `(×${mult})` : ''}:</span>
                    <span className="font-bold">{formatNumber(curLM)} btl</span>
                  </div>
                )}
                {!isSun && tySum > 0 && (
                  <div className="text-blue-400 flex justify-between">
                    <span className="text-neutral-400 font-sans">LY {mult > 1 ? `(×${mult})` : ''}:</span>
                    <span className="font-bold">{formatNumber(curLY)} btl</span>
                  </div>
                )}
                {hoveredPoint.bb !== undefined && hoveredPoint.bb > 0 && (
                  <div className="text-pink-400 flex justify-between pt-1 border-t border-neutral-800">
                    <span className="text-neutral-400 font-sans">BB:</span>
                    <span className="font-bold">{formatNumber(hoveredPoint.bb)} btl</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Master TKU Table: Switcher between Penjualan vs Kondisi Operasional (Spreadsheet FR/FS, Area, YL, Coverage) */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {tableTab === 'penjualan' ? 'Peringkat & Capaian Penjualan TKU' : 'Kondisi Operasional & Presensi TKU'}
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold">
                {rankedTkus.length} Unit
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {tableTab === 'penjualan' 
                ? (rankingCriteria === 'gabungan' ? 'Diurutkan berdasarkan rata-rata gabungan 3 target' : `Diurutkan berdasarkan ${rankingCriteria}`)
                : 'Data jumlah Area, jumlah YL, % Coverage Area, YL Absen, Frekuensi Absen, dan s/YL'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Tab Switcher: Penjualan vs Operasional */}
            <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
              <button
                onClick={() => setTableTab('penjualan')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tableTab === 'penjualan'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Penjualan & Target</span>
              </button>
              <button
                onClick={() => setTableTab('operasional')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tableTab === 'operasional'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Operasional & Absensi</span>
              </button>
            </div>

            {/* Ranking Selector (Only in Penjualan Mode) */}
            {tableTab === 'penjualan' && (
              <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-x-auto shrink-0 max-w-full">
                <button
                  onClick={() => setRankingCriteria('gabungan')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    rankingCriteria === 'gabungan'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Gabungan
                </button>
                <button
                  onClick={() => setRankingCriteria('target')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    rankingCriteria === 'target'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  vs Target
                </button>
                <button
                  onClick={() => setRankingCriteria('bulanLalu')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    rankingCriteria === 'bulanLalu'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  vs Bln Lalu
                </button>
                <button
                  onClick={() => setRankingCriteria('tahunLalu')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    rankingCriteria === 'tahunLalu'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  vs Th Lalu
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: PENJUALAN & TARGET */}
        {tableTab === 'penjualan' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[950px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                  <th className="py-2.5 px-3 font-semibold w-10 text-center">#</th>
                  <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                  <th className="py-2.5 px-2 font-semibold">Rayon</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Akumulasi</th>
                  <th className="py-2.5 px-3 text-right font-semibold" title={`Rata-rata dihitung dengan pembagi ${divider} hari (${dividerLabel})`}>
                    Rata/hari (÷{divider}hr)
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold text-amber-600 dark:text-amber-400 border-l border-neutral-200 dark:border-neutral-700">BB Akm</th>
                  <th className="py-2.5 px-2.5 text-right font-semibold text-amber-600 dark:text-amber-400">% BB</th>
                  <th className="py-2.5 px-3 text-right font-semibold border-l border-neutral-200 dark:border-neutral-700">vs Target</th>
                  <th className="py-2.5 px-3 text-right font-semibold">vs Bln Lalu</th>
                  <th className="py-2.5 px-3 text-right font-semibold">vs Th Lalu</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Rata 3 Target</th>
                  <th className="py-2.5 px-3 font-semibold w-28 text-left">Diagram Capaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                {rankedTkus.map((row, idx) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  const activeBarPct = getActivePct(row);
                  const barWidth = Math.min(100, Math.max(10, (activeBarPct / maxRankPct) * 100));

                  const barColor = rankingCriteria === 'bulanLalu'
                    ? 'bg-amber-500'
                    : rankingCriteria === 'tahunLalu'
                    ? 'bg-sky-500'
                    : 'bg-rose-600';

                  return (
                    <tr key={row.t.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold ${
                          isTop1 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                            : isTop2
                            ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            : isTop3
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'text-neutral-500'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                        {row.t.nama}
                      </td>

                      <td className="py-3 px-2 font-sans text-neutral-500">
                        R{row.t.rayon}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                        {formatNumber(row.akm)}
                      </td>

                      <td className="py-3 px-3 text-right text-neutral-600 dark:text-neutral-300">
                        {formatNumber(row.avg)}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400 border-l border-neutral-200 dark:border-neutral-700">
                        {formatNumber(row.akmBb)}
                      </td>

                      <td className="py-3 px-2.5 text-right font-semibold text-amber-600 dark:text-amber-400">
                        {formatPercent(row.pctBb)}
                      </td>

                      <td className={`py-3 px-3 text-right border-l border-neutral-200 dark:border-neutral-700 ${
                        rankingCriteria === 'target' ? 'bg-rose-50/40 dark:bg-rose-950/20 font-bold' : ''
                      }`}>
                        <div className={getStatusClass(row.diffTg)}>
                          {formatPercent(row.pctTg)}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-normal">
                          {formatDiff(row.diffTg)} btl
                        </div>
                      </td>

                      <td className={`py-3 px-3 text-right ${
                        rankingCriteria === 'bulanLalu' ? 'bg-amber-50/40 dark:bg-amber-950/20 font-bold' : ''
                      }`}>
                        <div className={getStatusClass(row.diffBl)}>
                          {formatPercent(row.pctBl)}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-normal">
                          {formatDiff(row.diffBl)} btl
                        </div>
                      </td>

                      <td className={`py-3 px-3 text-right ${
                        rankingCriteria === 'tahunLalu' ? 'bg-sky-50/40 dark:bg-sky-950/20 font-bold' : ''
                      }`}>
                        <div className={getStatusClass(row.diffTy)}>
                          {formatPercent(row.pctTy)}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-normal">
                          {formatDiff(row.diffTy)} btl
                        </div>
                      </td>

                      <td className={`py-3 px-3 text-right ${
                        rankingCriteria === 'gabungan' ? 'bg-rose-50/40 dark:bg-rose-950/20 font-bold' : ''
                      }`}>
                        <div className={`font-bold ${getStatusClass(row.pctGabungan - 1)}`}>
                          {formatPercent(row.pctGabungan)}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-normal font-sans">
                          skor rata-rata
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full transition-all duration-500`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-neutral-400 text-right mt-0.5">
                          {formatPercent(activeBarPct)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-neutral-300 dark:border-neutral-700 bg-neutral-100/70 dark:bg-neutral-800/70 font-mono text-xs font-bold text-neutral-900 dark:text-white">
                <tr>
                  <td colSpan={3} className="py-3 px-3 font-sans text-center">
                    TOTAL {selectedRayon === 0 ? 'CABANG' : `RAYON ${selectedRayon}`}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">
                    {formatNumber(rankedTkus.reduce((s, r) => s + r.akm, 0))}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {formatNumber(rankedTkus.reduce((s, r) => s + r.avg, 0))}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400 border-l border-neutral-200 dark:border-neutral-700">
                    {formatNumber(rankedTkus.reduce((s, r) => s + r.akmBb, 0))}
                  </td>
                  <td className="py-3 px-2.5 text-right text-amber-600 dark:text-amber-400">
                    {formatPercent((() => {
                      const a = rankedTkus.reduce((s, r) => s + r.akm, 0);
                      const b = rankedTkus.reduce((s, r) => s + r.akmBb, 0);
                      return (a + b) > 0 ? b / (a + b) : 0;
                    })())}
                  </td>
                  <td colSpan={5} className="py-3 px-3 text-neutral-400 font-sans font-normal text-[11px] text-right">
                    {rankedTkus.length} Unit TKU
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* TAB 2: KONDISI OPERASIONAL & ABSENSI (KOLOM FR/FS SPREADSHEET, AREA, YL, COVERAGE) */}
        {tableTab === 'operasional' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[1050px]">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                  <th className="py-2.5 px-3 font-semibold w-10 text-center">No</th>
                  <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                  <th className="py-2.5 px-2 font-semibold">Rayon</th>
                  <th className="py-2.5 px-3 text-center font-semibold bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                    Jml Area
                  </th>
                  <th className="py-2.5 px-3 text-center font-semibold bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                    Jml YL
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                    % Cover Area
                  </th>
                  <th className="py-2.5 px-3 text-center font-semibold bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
                    YL Absen
                  </th>
                  <th className="py-2.5 px-3 text-center font-semibold bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
                    Frekuensi Absen
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold bg-sky-50/50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300">
                    Akm JWP
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold bg-sky-50/50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300">
                    s/YL
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border-l border-neutral-200 dark:border-neutral-700">
                    YL &lt; 250
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                    YL &lt; 300
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
                {rankedTkus.map((row, idx) => {
                  return (
                    <tr key={row.t.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-3 text-center text-neutral-400 font-sans">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3 font-sans font-semibold text-neutral-900 dark:text-neutral-100">
                        {row.t.nama}
                      </td>

                      <td className="py-3 px-2 font-sans text-neutral-500">
                        R{row.t.rayon}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-neutral-800 dark:text-neutral-200 bg-emerald-50/20 dark:bg-emerald-950/10">
                        {row.area}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/20 dark:bg-emerald-950/10">
                        {row.yl}
                      </td>

                      <td className="py-3 px-3 text-right font-bold bg-emerald-50/20 dark:bg-emerald-950/10">
                        <span className={`px-2 py-0.5 rounded-md ${row.cover >= 1.0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'}`}>
                          {formatPercent(row.cover)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-bold bg-rose-50/20 dark:bg-rose-950/10">
                        <span className={row.abs > 0 ? 'text-rose-600 font-extrabold' : 'text-neutral-400 font-normal'}>
                          {row.abs} YL
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-bold bg-rose-50/20 dark:bg-rose-950/10">
                        <span className={row.frk > 0 ? 'text-rose-600 font-extrabold' : 'text-neutral-400 font-normal'}>
                          {row.frk} kali
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-semibold text-neutral-800 dark:text-neutral-200 bg-sky-50/20 dark:bg-sky-950/10">
                        {formatNumber(row.jwp)}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-sky-700 dark:text-sky-300 bg-sky-50/20 dark:bg-sky-950/10">
                        {row.s_yl}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400 bg-rose-50/20 dark:bg-rose-950/10 border-l border-neutral-200 dark:border-neutral-700">
                        {row.l250} <span className="text-[10px] text-neutral-400 font-normal">({formatPercent(row.pctL250)})</span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">
                        {row.l300} <span className="text-[10px] text-neutral-400 font-normal">({formatPercent(row.pctL300)})</span>
                      </td>
                    </tr>
                  );
                })}

                {/* Subtotal Row */}
                <tr className="bg-neutral-100/70 dark:bg-neutral-800/70 font-bold text-neutral-900 dark:text-white border-t-2 border-neutral-300 dark:border-neutral-700">
                  <td colSpan={3} className="py-3 px-3 font-sans text-center">
                    TOTAL {selectedRayon === 0 ? 'CABANG' : `RAYON ${selectedRayon}`}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-800 dark:text-emerald-300">
                    {totalArea}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-800 dark:text-emerald-300">
                    {totalYl}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-300">
                    {formatPercent(coverageAreaPct)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-rose-700 dark:text-rose-300">
                    {totalAbsenSpreadsheet} YL
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-rose-700 dark:text-rose-300">
                    {totalFrekSpreadsheet} kali
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sky-700 dark:text-sky-300">
                    {formatNumber(totalJwpSpreadsheet)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sky-700 dark:text-sky-300">
                    {totalJwpSpreadsheet > 0 ? Math.round(totalSold / totalJwpSpreadsheet) : 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
