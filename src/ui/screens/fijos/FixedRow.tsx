import { formatCop } from '../../../lib/currency';
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
  selected = false,
  onToggleSelect,
}: FixedRowProps) {
  const badge = STATUS_BADGE[fixed.status];

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
            <p className="text-sm text-slate-500">{formatCop(fixed.budgetedAmount)}</p>
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
