import { AppState, TkuItem, VARIANTS, DailySalesRecord } from '../types';
import { getPeriodInfo } from './storage';

export interface EvaluasiRow {
  tku: TkuItem;
  rawIdx: number;
  // Penjualan Varian
  yo: number;
  om: number;
  os: number;
  yt: number;
  akmPjl: number;
  rata2: number;
  // Perbandingan Waktu
  vsLwPct: number | null;
  diffLw: number | null;
  vsTgPct: number;
  diffTg: number;
  vsLmPct: number;
  diffLm: number;
  vsLyPct: number;
  diffLy: number;
  // Operasional
  akmBb: number;
  pctBb: number;
  akmPdm: number;
  jwp: number;
  syl: number;
  absen: number;
  frek: number;
  area: number;
  yl: number;
  cover: number;
  // YL Produktivitas Rendah
  l250: number;
  pctL250: number;
  l300: number;
  pctL300: number;
}

export interface EvaluasiGroup {
  key: string;
  label: string;
  kind: 'tku' | 'rayon' | 'cabang';
  rows: EvaluasiRow[];
  total: EvaluasiRow;
}

export interface EvaluasiHighlights {
  topRata: { name: string; val: number; rayon: number };
  topLw: { name: string; pct: number; rayon: number } | null;
  topTg: { name: string; pct: number; rayon: number };
  topLy: { name: string; pct: number; rayon: number };
  bestBb: { name: string; pct: number; rayon: number };
  topSyl: { name: string; val: number; rayon: number };
  bestAbsen: { name: string; abs: number; frk: number; rayon: number };
  bestCover: { name: string; pct: number; rayon: number };
  bestL250: { name: string; pct: number; rayon: number };
  lowestRata: { name: string; val: number; rayon: number };
  lowestTg: { name: string; pct: number; rayon: number };
}

export function buildEvaluasiData(state: AppState): {
  allRows: EvaluasiRow[];
  r1Rows: EvaluasiRow[];
  r2Rows: EvaluasiRow[];
  r1Total: EvaluasiRow;
  r2Total: EvaluasiRow;
  cabangTotal: EvaluasiRow;
  highlights: EvaluasiHighlights;
} {
  const period = getPeriodInfo(state);
  const day = state.currentDayNum;
  const divider = state.pembagiHari || day || 1;

  // Tentukan minggu aktif dan minggu lalu untuk perbandingan vs LW
  // W1: 1-7, W2: 8-14, W3: 15-21, W4: 22-28, W5: 29-30
  const curWeekIdx = Math.min(4, Math.floor((day - 1) / 7));
  const curWeekStart = curWeekIdx * 7 + 1;
  const curWeekEnd = Math.min(day, (curWeekIdx + 1) * 7);
  const curWeekDays = Math.max(1, curWeekEnd - curWeekStart + 1);

  const prevWeekIdx = curWeekIdx - 1;
  const prevWeekStart = prevWeekIdx >= 0 ? prevWeekIdx * 7 + 1 : 1;
  const prevWeekEnd = prevWeekIdx >= 0 ? (prevWeekIdx + 1) * 7 : 1;
  const prevWeekDays = prevWeekIdx >= 0 ? 7 : 0;

  const allRows: EvaluasiRow[] = state.tkus.map((t, idx) => {
    const rawIdx = idx;
    const yo = t.penjualanAkm[0] || 0;
    const om = t.penjualanAkm[1] || 0;
    const os = t.penjualanAkm[2] || 0;
    const yt = t.penjualanAkm[3] || 0;
    const akmPjl = yo + om + os + yt;
    const rata2 = divider > 0 ? akmPjl / divider : 0;

    // Perbandingan vs Target
    const tgHarian = t.targetHarian || 0;
    const vsTgPct = tgHarian > 0 ? rata2 / tgHarian : 0;
    const diffTg = akmPjl - tgHarian * divider;

    // Perbandingan vs Bulan Lalu (LM)
    const lmHarian = state.targetBulanLalu[idx] || 0;
    const vsLmPct = lmHarian > 0 ? rata2 / lmHarian : 0;
    const diffLm = akmPjl - lmHarian * divider;

    // Perbandingan vs Tahun Lalu (LY)
    const lyHarian = state.targetTahunLalu[idx] || 0;
    const vsLyPct = lyHarian > 0 ? rata2 / lyHarian : 0;
    const diffLy = akmPjl - lyHarian * divider;

    // Perhitungan Penjualan Minggu Ini vs Minggu Lalu (vs LW)
    // Rumus: di hari yang sama (rata2 hari ini / rata2 minggu lalu) * 100%
    let curWeekSales = 0;
    let prevWeekSales = 0;

    for (let d = curWeekStart; d <= curWeekEnd; d++) {
      const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
      const rec = state.pjd[dStr]?.[idx];
      if (rec) {
        curWeekSales += rec.sold || (rec.v ? rec.v.reduce((a, b) => a + b, 0) : 0);
      } else if (d === day && state.todayInputs[idx]) {
        curWeekSales += state.todayInputs[idx].sold || 0;
      }
    }

    // Hari yang sama di minggu lalu (rentang durasi hari kerja yang sama)
    const sameDayCount = curWeekDays;
    if (prevWeekIdx >= 0 && sameDayCount > 0) {
      const targetPrevEnd = Math.min(prevWeekEnd, prevWeekStart + sameDayCount - 1);
      for (let d = prevWeekStart; d <= targetPrevEnd; d++) {
        const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
        const rec = state.pjd[dStr]?.[idx];
        if (rec) {
          prevWeekSales += rec.sold || (rec.v ? rec.v.reduce((a, b) => a + b, 0) : 0);
        }
      }
    }

    // Rata-rata hari ini (s/d hari ini di minggu berjalan)
    const curWeekAvg = curWeekSales > 0 ? (curWeekSales / curWeekDays) : (rata2 > 0 ? rata2 : tgHarian);

    // Rata-rata minggu lalu pada hari yang sama
    let prevWeekAvg = 0;
    if (prevWeekSales > 0 && sameDayCount > 0) {
      prevWeekAvg = prevWeekSales / sameDayCount;
    } else if (prevWeekIdx >= 0 && sameDayCount > 0) {
      // Fallback ke rencana breakdown target minggu lalu pada hari yang sama
      let bdPrevTotal = 0;
      const targetPrevEnd = Math.min(prevWeekEnd, prevWeekStart + sameDayCount - 1);
      for (let d = prevWeekStart; d <= targetPrevEnd; d++) {
        bdPrevTotal += state.breakdown?.[idx]?.[d - 1] || tgHarian;
      }
      prevWeekAvg = bdPrevTotal / sameDayCount;
    } else {
      // Minggu 1 (Tgl 1-7): acuan minggu lalu adalah rata-rata bulan lalu (Agustus)
      prevWeekAvg = lmHarian > 0 ? lmHarian : (tgHarian > 0 ? tgHarian : rata2);
    }

    // vs LW (%) = (rata2 hari ini / rata2 minggu lalu) * 100%
    const vsLwPct = prevWeekAvg > 0 ? (curWeekAvg / prevWeekAvg) : (tgHarian > 0 ? rata2 / tgHarian : 1.0);
    const diffLw = curWeekAvg - prevWeekAvg;

    // Operasional Harian Akumulatif
    let akmBb = 0;
    let akmAbsen = 0;
    let akmFrek = 0;
    let lastRec: DailySalesRecord | null = null;

    for (let d = 1; d <= day; d++) {
      const dStr = `${period.key}-${String(d).padStart(2, '0')}`;
      const rec = state.pjd[dStr]?.[idx] || (d === day ? state.todayInputs[idx] : null);
      if (rec) {
        akmBb += rec.bb || 0;
        akmAbsen += rec.absen || 0;
        akmFrek += rec.frek || 0;
        lastRec = rec;
      }
    }

    const baseBbSum = t.bbAkm ? t.bbAkm.reduce((a, b) => a + b, 0) : 0;
    if (akmBb < baseBbSum) {
      akmBb = baseBbSum;
    }
    const finalAbsen = Math.max(akmAbsen, t.absenYl || 0);
    const finalFrek = Math.max(akmFrek, t.frekuensiAbsen || 0);
    const pctBb = akmPjl + akmBb > 0 ? akmBb / (akmPjl + akmBb) : 0;
    const akmPdm = akmPjl + akmBb;
    const area = lastRec?.ar || t.jumlahArea || 10;
    const yl = lastRec?.yl || t.jumlahYl || 10;
    const cover = area > 0 ? yl / area : 1.0;
    const jwp = lastRec?.jwp || (t.akmJwp || (yl * divider));
    const syl = jwp > 0 ? Math.round(akmPjl / jwp) : (t.sYl || 0);

    // YL < 250 & YL < 300
    const l250 = lastRec?.l250 ?? t.l250 ?? Math.max(0, Math.round(yl * (rata2 < 250 ? 0.6 : (rata2 < 300 ? 0.3 : 0.08))));
    const l300 = lastRec?.l300 ?? t.l300 ?? Math.max(l250, Math.round(yl * (rata2 < 300 ? 0.75 : (rata2 < 350 ? 0.4 : 0.15))));
    const pctL250 = yl > 0 ? l250 / yl : 0;
    const pctL300 = yl > 0 ? l300 / yl : 0;

    return {
      tku: t,
      rawIdx,
      yo,
      om,
      os,
      yt,
      akmPjl,
      rata2,
      vsLwPct,
      diffLw,
      vsTgPct,
      diffTg,
      vsLmPct,
      diffLm,
      vsLyPct,
      diffLy,
      akmBb,
      pctBb,
      akmPdm,
      jwp,
      syl,
      absen: finalAbsen,
      frek: finalFrek,
      area,
      yl,
      cover,
      l250,
      pctL250,
      l300,
      pctL300
    };
  });

  const r1Rows = allRows.filter(r => r.tku.aktif && r.tku.rayon === 1);
  const r2Rows = allRows.filter(r => r.tku.aktif && r.tku.rayon === 2);

  const aggregateRows = (rows: EvaluasiRow[], label: string, rayon: 1 | 2): EvaluasiRow => {
    const yo = rows.reduce((s, r) => s + r.yo, 0);
    const om = rows.reduce((s, r) => s + r.om, 0);
    const os = rows.reduce((s, r) => s + r.os, 0);
    const yt = rows.reduce((s, r) => s + r.yt, 0);
    const akmPjl = yo + om + os + yt;
    const rata2 = divider > 0 ? akmPjl / divider : 0;

    const tgHarian = rows.reduce((s, r) => s + r.tku.targetHarian, 0);
    const vsTgPct = tgHarian > 0 ? rata2 / tgHarian : 0;
    const diffTg = akmPjl - tgHarian * divider;

    const lmHarian = rows.reduce((s, r) => s + (state.targetBulanLalu[r.rawIdx] || 0), 0);
    const vsLmPct = lmHarian > 0 ? rata2 / lmHarian : 0;
    const diffLm = akmPjl - lmHarian * divider;

    const lyHarian = rows.reduce((s, r) => s + (state.targetTahunLalu[r.rawIdx] || 0), 0);
    const vsLyPct = lyHarian > 0 ? rata2 / lyHarian : 0;
    const diffLy = akmPjl - lyHarian * divider;

    const akmBb = rows.reduce((s, r) => s + r.akmBb, 0);
    const pctBb = akmPjl + akmBb > 0 ? akmBb / (akmPjl + akmBb) : 0;
    const akmPdm = akmPjl + akmBb;
    const jwp = rows.reduce((s, r) => s + r.jwp, 0);
    const syl = jwp > 0 ? Math.round(akmPjl / jwp) : 0;
    const absen = rows.reduce((s, r) => s + r.absen, 0);
    const frek = rows.reduce((s, r) => s + r.frek, 0);
    const area = rows.reduce((s, r) => s + r.area, 0);
    const yl = rows.reduce((s, r) => s + r.yl, 0);
    const cover = area > 0 ? yl / area : 1.0;

    const l250 = rows.reduce((s, r) => s + r.l250, 0);
    const l300 = rows.reduce((s, r) => s + r.l300, 0);
    const pctL250 = yl > 0 ? l250 / yl : 0;
    const pctL300 = yl > 0 ? l300 / yl : 0;

    const validLwRows = rows.filter(r => r.vsLwPct !== null);
    const vsLwPct = validLwRows.length > 0 
      ? validLwRows.reduce((s, r) => s + (r.vsLwPct || 0), 0) / validLwRows.length 
      : null;
    const diffLw = validLwRows.length > 0 ? rows.reduce((s, r) => s + (r.diffLw || 0), 0) : null;

    const fakeTku: TkuItem = {
      id: 999,
      nama: label,
      rayon,
      targetHarian: tgHarian,
      penjualanAkm: [yo, om, os, yt],
      aktif: true
    };

    return {
      tku: fakeTku,
      rawIdx: -1,
      yo,
      om,
      os,
      yt,
      akmPjl,
      rata2,
      vsLwPct,
      diffLw,
      vsTgPct,
      diffTg,
      vsLmPct,
      diffLm,
      vsLyPct,
      diffLy,
      akmBb,
      pctBb,
      akmPdm,
      jwp,
      syl,
      absen,
      frek,
      area,
      yl,
      cover,
      l250,
      pctL250,
      l300,
      pctL300
    };
  };

  const r1Total = aggregateRows(r1Rows, 'Subtotal Rayon 1', 1);
  const r2Total = aggregateRows(r2Rows, 'Subtotal Rayon 2', 2);
  const cabangTotal = aggregateRows(allRows.filter(r => r.tku.aktif), 'Total Cabang Jember', 1);

  // Perhitungan Highlights Performa
  const activeOnly = allRows.filter(r => r.tku.aktif);

  const topRataRow = [...activeOnly].sort((a, b) => b.rata2 - a.rata2)[0] || activeOnly[0];
  const lowestRataRow = [...activeOnly].sort((a, b) => a.rata2 - b.rata2)[0] || activeOnly[0];

  const validLwRows = activeOnly.filter(r => r.vsLwPct !== null);
  const topLwRow = validLwRows.length > 0 ? [...validLwRows].sort((a, b) => (b.vsLwPct || 0) - (a.vsLwPct || 0))[0] : null;

  const topTgRow = [...activeOnly].sort((a, b) => b.vsTgPct - a.vsTgPct)[0] || activeOnly[0];
  const lowestTgRow = [...activeOnly].sort((a, b) => a.vsTgPct - b.vsTgPct)[0] || activeOnly[0];

  const topLyRow = [...activeOnly].sort((a, b) => b.vsLyPct - a.vsLyPct)[0] || activeOnly[0];
  const bestBbRow = [...activeOnly].sort((a, b) => a.pctBb - b.pctBb)[0] || activeOnly[0];
  const topSylRow = [...activeOnly].sort((a, b) => b.syl - a.syl)[0] || activeOnly[0];
  const bestAbsenRow = [...activeOnly].sort((a, b) => (a.absen + a.frek) - (b.absen + b.frek))[0] || activeOnly[0];
  const bestCoverRow = [...activeOnly].sort((a, b) => b.cover - a.cover)[0] || activeOnly[0];
  const bestL250Row = [...activeOnly].sort((a, b) => a.pctL250 - b.pctL250)[0] || activeOnly[0];

  const highlights: EvaluasiHighlights = {
    topRata: { name: topRataRow.tku.nama, val: topRataRow.rata2, rayon: topRataRow.tku.rayon },
    topLw: topLwRow ? { name: topLwRow.tku.nama, pct: topLwRow.vsLwPct || 1, rayon: topLwRow.tku.rayon } : null,
    topTg: { name: topTgRow.tku.nama, pct: topTgRow.vsTgPct, rayon: topTgRow.tku.rayon },
    topLy: { name: topLyRow.tku.nama, pct: topLyRow.vsLyPct, rayon: topLyRow.tku.rayon },
    bestBb: { name: bestBbRow.tku.nama, pct: bestBbRow.pctBb, rayon: bestBbRow.tku.rayon },
    topSyl: { name: topSylRow.tku.nama, val: topSylRow.syl, rayon: topSylRow.tku.rayon },
    bestAbsen: { name: bestAbsenRow.tku.nama, abs: bestAbsenRow.absen, frk: bestAbsenRow.frek, rayon: bestAbsenRow.tku.rayon },
    bestCover: { name: bestCoverRow.tku.nama, pct: bestCoverRow.cover, rayon: bestCoverRow.tku.rayon },
    bestL250: { name: bestL250Row.tku.nama, pct: bestL250Row.pctL250, rayon: bestL250Row.tku.rayon },
    lowestRata: { name: lowestRataRow.tku.nama, val: lowestRataRow.rata2, rayon: lowestRataRow.tku.rayon },
    lowestTg: { name: lowestTgRow.tku.nama, pct: lowestTgRow.vsTgPct, rayon: lowestTgRow.tku.rayon }
  };

  return {
    allRows,
    r1Rows,
    r2Rows,
    r1Total,
    r2Total,
    cabangTotal,
    highlights
  };
}
