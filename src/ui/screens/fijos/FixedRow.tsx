import { formatCop } from '../../../lib/currency';
import { progressBarColor } from '../../../lib/progress';
import { budgetBackedFilled } from '../../../domain/budgetBackedFixed';
import type { FixedStatus } from '../../../domain/types';
import type { FixedRowProps } from './FixedRowProps';

// Una obligación fija del mes con su estado y acciones (CLAUDE.md §8.3).
const STATUS_BADGE: Record<FixedStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-slate-100 text-slate-500' },
  allocated: { label: 'Destinado', className: 'bg-amber-100 text-amber-700' },
  paid: { label: 'Pagado', className: 'bg-emerald-100 text-emerald-700' },
};

export function FixedRow({
  fixed,
  onAllocate,
  onUnallocate,
  onPay,
  onMarkPaid,
  onRevert,
  budgetConsumed = 0,
  onEditCap,
  selected = false,
  onToggleSelect,
  nested = false,
}: FixedRowProps) {
  // Fijo respaldado por presupuesto (§5.9): no se paga; muestra el avance del gasto vs el tope y se
  // marca "Lleno" cuando el gasto de su categoría alcanza el tope.
  if (fixed.budgetBacked) {
    const cap = fixed.budgetedAmount;
    const filled = budgetBackedFilled(budgetConsumed, cap);
    const exceeded = budgetConsumed > cap; // gastó MÁS que el tope (§5.9)
    const overspend = budgetConsumed - cap;
    const ratio = cap > 0 ? budgetConsumed / cap : 0;
    const pct = Math.min(100, Math.round(ratio * 100));
    const barColor = progressBarColor(ratio);

    const chip = exceeded
      ? { label: 'Excedido', className: 'bg-red-100 text-red-700' }
      : filled
        ? { label: 'Lleno', className: 'bg-emerald-100 text-emerald-700' }
        : { label: 'En curso', className: 'bg-slate-100 text-slate-500' };

    return (
      <li
        className={`rounded-xl border bg-white p-4 ${
          selected ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            {onToggleSelect && (
              <input
                type="checkbox"
                checked={selected}
                onChange={onToggleSelect}
                aria-label={`Seleccionar ${fixed.name}`}
                className="mt-0.5 h-5 w-5 shrink-0 accent-slate-800"
              />
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800">{fixed.name}</p>
              <p className="text-sm text-slate-500">{formatCop(cap)}</p>
            </div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${chip.className}`}>
            {chip.label}
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={exceeded ? 'font-medium text-red-600' : 'text-slate-500'}>
            {exceeded
              ? `Te excediste ${formatCop(overspend)}`
              : `${formatCop(budgetConsumed)} de ${formatCop(cap)}`}
          </span>
          {onEditCap && (
            <button type="button" onClick={onEditCap} className="text-slate-400 underline">
              Editar tope
            </button>
          )}
        </div>
      </li>
    );
  }

  const badge = STATUS_BADGE[fixed.status];

  return (
    <li
      className={`rounded-xl border bg-white p-4 ${
        selected ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-200'
      } ${nested ? 'ml-5 border-l-4 border-l-slate-200' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              aria-label={`Seleccionar ${fixed.name}`}
              className="mt-0.5 h-5 w-5 shrink-0 accent-slate-800"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800">{fixed.name}</p>
            <p className="text-sm text-slate-500">
              {/* Si se pagó con un monto real distinto al presupuestado, se muestra el real (§5.3). */}
              {formatCop(fixed.paidAmount ?? fixed.budgetedAmount)}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {fixed.status !== 'paid' && (
        <div className="mt-3 flex gap-2">
          {fixed.status === 'pending' && (
            <button
              type="button"
              onClick={onAllocate}
              className="flex-1 rounded-lg border border-amber-300 py-2 text-sm font-medium text-amber-700"
            >
              Destinar
            </button>
          )}
          {fixed.status === 'allocated' && (
            <button
              type="button"
              onClick={onUnallocate}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500"
            >
              Deshacer
            </button>
          )}
          <button
            type="button"
            onClick={onPay}
            className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-medium text-white"
          >
            Pagar
          </button>
        </div>
      )}

      {fixed.status !== 'paid' && (
        // "Ya estaba pagado": marca pagado sin crear movimiento ni tocar saldos (§ back-fill).
        <button
          type="button"
          onClick={onMarkPaid}
          className="mt-2 w-full text-center text-xs text-slate-400 underline"
        >
          Ya estaba pagado (sin movimiento)
        </button>
      )}

      {fixed.status === 'paid' && (
        // Deshacer: si hubo movimiento, devuelve el dinero a su origen; si no, solo vuelve a pendiente.
        <button
          type="button"
          onClick={onRevert}
          className="mt-2 w-full text-center text-xs text-slate-400 underline"
        >
          Deshacer pago
        </button>
      )}
    </li>
  );
}
