import { formatCop } from '../../../lib/currency';
import { progressBarColor } from '../../../lib/progress';
import { budgetBackedFilled } from '../../../domain/budgetBackedFixed';
import type { BudgetChecklistCardProps } from './BudgetChecklistCardProps';

// Presupuesto "de checklist" en la vista mensual de Fijos (Opción C, §5.9): no se paga con un
// movimiento; muestra el avance del gasto vs el tope y se marca "Lleno" cuando el gasto de su
// categoría alcanza el tope. Reemplaza la fila respaldada (FixedRow budgetBacked), pero ahora el
// estado/tope vienen del `Budget`. Sus ítems `consumesBudget` se renderizan anidados aparte (el padre).
export function BudgetChecklistCard({
  categoryName,
  cap,
  consumed,
  manuallyPaid,
  onEditCap,
  onMarkPaid,
  onUndoPaid,
}: BudgetChecklistCardProps) {
  const filledByConsumption = budgetBackedFilled(consumed, cap);
  const filled = manuallyPaid || filledByConsumption;
  const exceeded = !manuallyPaid && consumed > cap; // gastó MÁS que el tope (§5.9)
  const overspend = consumed - cap;
  const ratio = cap > 0 ? consumed / cap : 0;
  const pct = manuallyPaid ? 100 : Math.min(100, Math.round(ratio * 100));
  const barColor = manuallyPaid ? 'bg-emerald-500' : progressBarColor(ratio);

  const chip = exceeded
    ? { label: 'Excedido', className: 'bg-red-100 text-red-700' }
    : filled
      ? { label: 'Lleno', className: 'bg-emerald-100 text-emerald-700' }
      : { label: 'En curso', className: 'bg-slate-100 text-slate-500' };

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">{categoryName}</p>
          <p className="text-sm text-slate-500">{formatCop(cap)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${chip.className}`}>
          {chip.label}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={exceeded ? 'font-medium text-red-600' : 'text-slate-500'}>
          {manuallyPaid
            ? 'Pagado (sin movimiento)'
            : exceeded
              ? `Te excediste ${formatCop(overspend)}`
              : `${formatCop(consumed)} de ${formatCop(cap)}`}
        </span>
        <button type="button" onClick={onEditCap} className="text-slate-400 underline">
          Editar tope
        </button>
      </div>

      {/* "Ya estaba pagado (sin movimiento)": solo cuando NO está lleno por gasto ni marcado a mano. */}
      {!manuallyPaid && !filledByConsumption && (
        <button
          type="button"
          onClick={onMarkPaid}
          className="mt-2 w-full text-center text-xs text-slate-400 underline"
        >
          Ya estaba pagado (sin movimiento)
        </button>
      )}
      {manuallyPaid && (
        <button
          type="button"
          onClick={onUndoPaid}
          className="mt-2 w-full text-center text-xs text-slate-400 underline"
        >
          Deshacer
        </button>
      )}
    </li>
  );
}
