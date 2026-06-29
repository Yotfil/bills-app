import { formatCop } from '../../../lib/currency';
import { NEAR_LIMIT_RATIO, progressBarColor } from '../../../lib/progress';
import type { BudgetMonthCardProps } from './BudgetMonthCardProps';

// Tarjeta de un presupuesto NORMAL en la vista MENSUAL (/fijos, §5.9): barra de consumo del mes vs
// el tope efectivo del mes, y "Editar tope" para ajustar SOLO ese mes (override) sin tocar la base.
export function BudgetMonthCard({
  categoryName,
  status,
  overridden,
  onEditCap,
  onResetCap,
}: BudgetMonthCardProps) {
  const ratio = status.limit > 0 ? status.consumed / status.limit : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  const near = ratio > NEAR_LIMIT_RATIO && !status.exceeded;

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-semibold text-slate-800">{categoryName}</p>
          {overridden && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
              Ajustado este mes
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${progressBarColor(ratio)}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {formatCop(status.consumed)} de {formatCop(status.limit)}
        </span>
        <button type="button" onClick={onEditCap} className="text-slate-400 underline">
          Editar tope
        </button>
      </div>

      <div className="mt-1 flex items-center justify-between text-xs">
        <span className={status.exceeded ? 'font-medium text-red-600' : 'text-slate-400'}>
          {status.exceeded
            ? `Te pasaste ${formatCop(-status.remaining)}`
            : `Quedan ${formatCop(status.remaining)}`}
        </span>
        {overridden && (
          <button type="button" onClick={onResetCap} className="text-slate-400 underline">
            Volver a la base
          </button>
        )}
      </div>

      {near && <p className="mt-1 text-xs text-amber-600">Vas cerca del tope.</p>}
    </li>
  );
}
