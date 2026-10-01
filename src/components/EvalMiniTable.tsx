import React from 'react';
import { EvaluasiRow } from '../services/evaluasi';
import { formatNumber, formatPercent, getStatusClass } from '../services/storage';

interface EvalMiniTableProps {
  r1Rows: EvaluasiRow[];
  r2Rows: EvaluasiRow[];
  r1Total: EvaluasiRow;
  r2Total: EvaluasiRow;
  cabangTotal: EvaluasiRow;
  selectedRayon: number;
}

export const EvalMiniTable: React.FC<EvalMiniTableProps> = ({
  r1Rows,
  r2Rows,
  r1Total,
  r2Total,
  cabangTotal,
  selectedRayon
}) => {
  const thCls = "py-2.5 px-2.5 text-right font-semibold whitespace-nowrap";
  const tdCls = "py-2 px-2.5 text-right whitespace-nowrap";

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
        <td className={`sticky left-0 z-10 px-3 py-2 text-left font-sans font-semibold whitespace-nowrap border-r border-neutral-200 dark:border-neutral-700 ${stickyBg}`}>
          <div className="flex items-center gap-1.5">
            <span>{r.tku.nama}</span>
            {!isSubtotal && !isTotal && (
              <span className="text-[10px] text-neutral-400 font-normal">R{r.tku.rayon}</span>
            )}
          </div>
        </td>

        {/* Rata2 */}
        <td className={`${tdCls} font-bold text-neutral-900 dark:text-neutral-100 border-l border-neutral-200 dark:border-neutral-700`}>
          {formatNumber(Math.round(r.rata2))}
        </td>

        {/* vs LW (%) */}
        <td className={tdCls}>
          {r.vsLwPct !== null ? (
            <span className={isTotal || isSubtotal ? '' : getStatusClass(r.vsLwPct - 1)}>
              {formatPercent(r.vsLwPct)}
            </span>
          ) : (
            <span className="text-neutral-400 font-normal">—</span>
          )}
        </td>

        {/* vs Tgt (%) */}
        <td className={tdCls}>
          <span className={isTotal || isSubtotal ? '' : getStatusClass(r.diffTg)}>
            {formatPercent(r.vsTgPct)}
          </span>
        </td>

        {/* vs LY (%) */}
        <td className={tdCls}>
          <span className={isTotal || isSubtotal ? '' : getStatusClass(r.diffLy)}>
            {formatPercent(r.vsLyPct)}
          </span>
        </td>

        {/* % BB */}
        <td className={`${tdCls} text-amber-600 dark:text-amber-400 font-bold border-l border-neutral-200 dark:border-neutral-700`}>
          {formatPercent(r.pctBb)}
        </td>

        {/* s/YL */}
        <td className={`${tdCls} font-bold text-rose-600 dark:text-rose-400`}>
          {formatNumber(r.syl)}
        </td>

        {/* YL Absen & Freq */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700 text-center`}>
          <span className={r.absen > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-neutral-400'}>
            {r.absen}
          </span>
        </td>
        <td className={`${tdCls} text-center`}>
          <span className={r.frek > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-neutral-400'}>
            {r.frek}
          </span>
        </td>

        {/* % Cover Area (CA) */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700 font-bold ${r.cover >= 1.0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {formatPercent(r.cover)}
        </td>

        {/* % YL < 250 */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700 font-bold ${r.pctL250 > 0.3 ? 'text-rose-600 dark:text-rose-400' : r.pctL250 > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {formatPercent(r.pctL250)}
        </td>

        {/* % YL < 300 */}
        <td className={`${tdCls} border-l border-neutral-200 dark:border-neutral-700 font-bold ${r.pctL300 > 0.4 ? 'text-rose-600 dark:text-rose-400' : r.pctL300 > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {formatPercent(r.pctL300)}
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto max-h-[650px] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm w-full">
      <table className="w-full text-xs text-left border-collapse min-w-[860px]">
        <thead className="sticky top-0 z-20 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shadow-2xs border-b border-neutral-200 dark:border-neutral-700">
          <tr>
            <th className="sticky left-0 z-30 px-3 py-2.5 text-left font-semibold bg-neutral-100 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 min-w-[120px]">
              Nama TKU
            </th>
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>Rata2</th>
            <th className={thCls}>vs LW (%)</th>
            <th className={thCls}>vs Tgt (%)</th>
            <th className={thCls}>vs LY (%)</th>
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700 text-amber-600 dark:text-amber-400`}>% BB</th>
            <th className={`${thCls} text-rose-600 dark:text-rose-400`}>s/YL</th>
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700 text-center`}>Absen</th>
            <th className={`${thCls} text-center`}>Freq</th>
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700`}>% CA</th>
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700 text-rose-600 dark:text-rose-400`}>% YL &lt; 250</th>
            <th className={`${thCls} border-l border-neutral-200 dark:border-neutral-700 text-amber-600 dark:text-amber-400`}>% YL &lt; 300</th>
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
