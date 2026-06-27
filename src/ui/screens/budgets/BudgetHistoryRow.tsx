import { formatCop } from '../../../lib/currency';
import { progressBarColor } from '../../../lib/progress';
import type { BudgetHistoryRowProps } from './BudgetHistoryRowProps';

// Fila de SOLO LECTURA del histórico de presupuestos (CLAUDE.md §5.9, §8.4): el gasto de una
// categoría en un mes pasado vs su tope, sin acciones (no se edita el pasado).
export function BudgetHistoryRow({ categoryName, status, linkedToFixed = false }: BudgetHistoryRowProps) {
  const ratio = status.limit > 0 ? status.consumed / status.limit : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  const barColor = progressBarColor(ratio);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-semibold text-slate-800">{categoryName}</p>
          {linkedToFixed && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              Fijo ligado
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {formatCop(status.consumed)} de {formatCop(status.limit)}
        </span>
        <span className={status.exceeded ? 'font-medium text-red-600' : 'text-slate-400'}>
          {status.exceeded
            ? `Te pasaste ${formatCop(-status.remaining)}`
            : `Quedaron ${formatCop(status.remaining)}`}
        </span>
      </div>
    </li>
  );
}
