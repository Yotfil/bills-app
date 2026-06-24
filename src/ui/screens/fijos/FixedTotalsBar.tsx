import { formatCop } from '../../../lib/currency';
import type { FixedTotalsBarProps } from './FixedTotalsBarProps';

// Totales del checklist de fijos (CLAUDE.md §8.3): falta por destinar, destinado y pagado.
export function FixedTotalsBar({ totals }: FixedTotalsBarProps) {
  return (
    <section className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-4 text-center shadow-sm">
      <div>
        <p className="text-xs text-slate-400">Por destinar</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-700">
          {formatCop(totals.pendingAmount)}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Destinado</p>
        <p className="mt-0.5 text-sm font-semibold text-amber-600">
          {formatCop(totals.allocatedAmount)}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Pagado</p>
        <p className="mt-0.5 text-sm font-semibold text-emerald-600">
          {formatCop(totals.paidAmount)}
        </p>
      </div>
    </section>
  );
}
