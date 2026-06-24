import { formatCop } from '../../../lib/currency';
import type { MonthSummaryCardProps } from './MonthSummaryCardProps';

// Resumen del mes (CLAUDE.md §8.1): Ingresos | Gastos | Flujo, con color en el flujo.
export function MonthSummaryCard({ summary }: MonthSummaryCardProps) {
  const flowPositive = summary.flow >= 0;
  return (
    <section className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-4 text-center shadow-sm">
      <div>
        <p className="text-xs text-slate-400">Ingresos</p>
        <p className="mt-0.5 text-sm font-semibold text-emerald-600">{formatCop(summary.income)}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Gastos</p>
        <p className="mt-0.5 text-sm font-semibold text-red-600">{formatCop(summary.expense)}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Flujo</p>
        <p
          className={`mt-0.5 text-sm font-semibold ${flowPositive ? 'text-emerald-600' : 'text-red-600'}`}
        >
          {formatCop(summary.flow)}
        </p>
      </div>
    </section>
  );
}
