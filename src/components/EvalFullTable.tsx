import React from 'react';
import { EvaluasiRow } from '../services/evaluasi';
import { formatNumber, formatPercent, getStatusClass } from '../services/storage';
import { VARIANTS } from '../types';

interface EvalFullTableProps {
  rows: EvaluasiRow[];
  r1Rows: EvaluasiRow[];
  r2Rows: EvaluasiRow[];
  r1Total: EvaluasiRow;
  r2Total: EvaluasiRow;
  cabangTotal: EvaluasiRow;
  selectedRayon: number; // 0: Cabang, 1: Rayon 1, 2: Rayon 2
  divider: number;
}

export const EvalFullTable: React.FC<EvalFullTableProps> = ({
  r1Rows,
  r2Rows,
  r1Total,
  r2Total,
  cabangTotal,
  selectedRayon
}) => {
  const thCls = "py-2 px-2 text-right font-semibold whitespace-nowrap";
  const tdCls = "py-2 px-2 text-right whitespace-nowrap";

  const renderRow = (r: EvaluasiRow, isSubtotal = false, isTotal = false) => {
    const rowBg = isTotal
      ? 'bg-neutral-900 text-white dark:bg-neutral-950 font-bold border-t-2 border-neutral-700'
      : isSubtotal
      ? 'bg-neutral-100 dark:bg-neutral-800/80 font-bold text-neutral-800 dark:text-neutral-200'
      : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 text-neutral-800 dark:text-neutral-200 font-medium';

    const stickyBg = isTotal
      ? 'bg-neutral-900 text-white dark:bg-neutral-950 font-bold'
      : isSubtotal
      ? 'bg-neutral-100 dark:bg-neutral-800'
      : 'bg-white dark:bg-neutral-900';

    return (
      <tr key={r.tku.id + (isSubtotal ? '-sub' : '') + (isTotal ? '-tot' : '')} className={`transition-colors font-mono text-xs ${rowBg}`}>
        {/* Sticky Unit Name */}
        <td className={`sticky left-0 z-10 px-3 py-2 text-left font-sans font-semibold whitespace-nowrap border-r border-neutral-200 dark:border-neutral-700 ${stickyBg}`}>
          <div className="flex items-center gap-1.5">
            <span>{r.tku.nama}</span>
            {!isSubtotal && !isTotal && (
              <span className="text-[10px] text-neutral-400 font-normal">R{r.tku.rayon}</span>
            )}
          </div>
        </td>

        {/* Varian Penjualan */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700`} style={{ color: VARIANTS[0].color }}>{formatNumber(r.yo)}</td>
        <td className={tdCls} style={{ color: VARIANTS[1].color }}>{formatNumber(r.om)}</td>
        <td className={tdCls} style={{ color: VARIANTS[2].color }}>{formatNumber(r.os)}</td>
        <td className={tdCls} style={{ color: VARIANTS[3].color }}>{formatNumber(r.yt)}</td>

        {/* Akumulasi & Rata-rata */}
        <td className={`${tdCls} font-bold text-rose-600 dark:text-rose-400 border-l border-neutral-200 dark:border-neutral-700`}>{formatNumber(r.akmPjl)}</td>
        <td className={`${tdCls} font-bold text-neutral-900 dark:text-neutral-100`}>{formatNumber(Math.round(r.rata2))}</td>

        {/* vs LW (Last Week) */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700`}>
          {r.vsLwPct !== null ? (
            <span className={isTotal || isSubtotal ? '' : getStatusClass(r.vsLwPct - 1)}>
              {formatPercent(r.vsLwPct)}
            </span>
          ) : (
            <span className="text-neutral-400 font-normal">—</span>
          )}
        </td>

        {/* vs Target */}
        <td className={tdCls}>
          <span className={isTotal || isSubtotal ? '' : getStatusClass(r.diffTg)}>
            {formatPercent(r.vsTgPct)}
          </span>
        </td>

        {/* vs LM (Bulan Lalu) */}
        <td className={tdCls}>
          <span className={isTotal || isSubtotal ? '' : getStatusClass(r.diffLm)}>
            {formatPercent(r.vsLmPct)}
          </span>
        </td>

        {/* vs LY (Tahun Lalu) */}
        <td className={tdCls}>
          <span className={isTotal || isSubtotal ? '' : getStatusClass(r.diffLy)}>
            {formatPercent(r.vsLyPct)}
          </span>
        </td>

        {/* Balik Botol */}
        <td className={`${tdCls} text-amber-600 dark:text-amber-400 border-l border-neutral-200 dark:border-neutral-700`}>{formatNumber(r.akmBb)}</td>
        <td className={`${tdCls} text-amber-600 dark:text-amber-400 font-semibold`}>{formatPercent(r.pctBb)}</td>

        {/* JWP & s/YL */}
        <td className={`${tdCls} text-sky-600 dark:text-sky-400 border-l border-neutral-200 dark:border-neutral-700`}>{formatNumber(r.jwp)}</td>
        <td className={`${tdCls} font-bold text-rose-600 dark:text-rose-400`}>{formatNumber(r.syl)}</td>

        {/* Absen & Frek */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700`}>
          {r.absen > 0 ? (
            <span className="text-rose-600 dark:text-rose-400 font-bold">{r.absen}</span>
          ) : (
            <span className="text-neutral-400">0</span>
          )}
        </td>
        <td className={tdCls}>
          {r.frek > 0 ? (
            <span className="text-rose-600 dark:text-rose-400 font-bold">{r.frek}</span>
          ) : (
            <span className="text-neutral-400">0</span>
          )}
        </td>

        {/* Area, YL, % Cover */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700`}>{r.area}</td>
        <td className={tdCls}>{r.yl}</td>
        <td className={`${tdCls} font-bold ${r.cover >= 1.0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {formatPercent(r.cover)}
        </td>

        {/* YL < 250 & YL < 300 */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700 text-rose-600 dark:text-rose-400`}>{r.l250}</td>
        <td className={`${tdCls} text-rose-600 dark:text-rose-400 font-semibold`}>{formatPercent(r.pctL250)}</td>
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700 text-amber-600 dark:text-amber-400`}>{r.l300}</td>
        <td className={`${tdCls} text-amber-600 dark:text-amber-400 font-semibold`}>{formatPercent(r.pctL300)}</td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto max-h-[700px] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
      <table className="w-full text-xs text-left border-collapse min-w-[1600px]">
        <thead className="sticky top-0 z-20 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shadow-2xs border-b border-neutral-200 dark:border-neutral-700">
          <tr>
            <th rowSpan={2} className="sticky left-0 z-30 px-3 py-2 text-left font-semibold bg-neutral-100 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 min-w-[140px]">
              Nama TKU
            </th>
            <th colSpan={6} className="py-1 px-2 text-center font-bold border-l border-neutral-200 dark:border-neutral-700 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
              Penjualan
            </th>
            <th colSpan={4} className="py-1 px-2 text-center font-bold border-l border-neutral-200 dark:border-neutral-700 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
              Perbandingan
            </th>
            <th colSpan={2} className="py-1 px-2 text-center font-bold border-l border-neutral-200 dark:border-neutral-700 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
              BB
            </th>
            <th colSpan={2} className="py-1 px-2 text-center font-bold border-l border-neutral-200 dark:border-neutral-700 bg-sky-50/50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300">
              Produktivitas
            </th>
            <th colSpan={2} className="py-1 px-2 text-center font-bold border-l border-neutral-200 dark:border-neutral-700 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
              Presensi
            </th>
            <th colSpan={3} className="py-1 px-2 text-center font-bold border-l border-neutral-200 dark:border-neutral-700 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
              Area &amp; YL
            </th>
            <th colSpan={2} className="py-1 px-2 text-center font-bold border-l border-neutral-200 dark:border-neutral-700 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
              YL &lt; 250
            </th>
            <th colSpan={2} className="py-1 px-2 text-center font-bold border-l border-neutral-200 dark:border-neutral-700 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
              YL &lt; 300
            </th>
          </tr>
          <tr className="border-t border-neutral-200 dark:border-neutral-700 text-[11px]">
            {/* Varian */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`} style={{ color: VARIANTS[0].color }}>YO</th>
            <th className={thCls} style={{ color: VARIANTS[1].color }}>OM</th>
            <th className={thCls} style={{ color: VARIANTS[2].color }}>OS</th>
            <th className={thCls} style={{ color: VARIANTS[3].color }}>YT</th>
            {/* Penjualan */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>Akm Pjl</th>
            <th className={thCls}>Rata2</th>
            {/* Waktu */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>vs LW</th>
            <th className={thCls}>vs Tgt</th>
            <th className={thCls}>vs LM</th>
            <th className={thCls}>vs LY</th>
            {/* BB */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>Akm BB</th>
            <th className={thCls}>% BB</th>
            {/* Produktivitas */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>JWP</th>
            <th className={thCls}>s/YL</th>
            {/* Presensi */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>Abs</th>
            <th className={thCls}>Frk</th>
            {/* Area */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>Area</th>
            <th className={thCls}>YL</th>
            <th className={thCls}>% CA</th>
            {/* YL < 250 */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>Jml</th>
            <th className={thCls}>%</th>
            {/* YL < 300 */}
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>Jml</th>
            <th className={thCls}>%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {/* Rayon 1 */}
          {(selectedRayon === 0 || selectedRayon === 1) && (
            <>
              {r1Rows.map(r => renderRow(r))}
              {renderRow(r1Total, true)}
            </>
          )}

          {/* Rayon 2 */}
          {(selectedRayon === 0 || selectedRayon === 2) && (
            <>
              {r2Rows.map(r => renderRow(r))}
              {renderRow(r2Total, true)}
            </>
          )}
        </tbody>
        {selectedRayon === 0 && (
          <tfoot className="sticky bottom-0 z-20">
            {renderRow(cabangTotal, false, true)}
          </tfoot>
        )}
      </table>
    </div>
  );
};
