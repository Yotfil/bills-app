import { Pencil, Scale, Archive, Trash2 } from 'lucide-react';
import { ActionMenu } from '../../components/ActionMenu';
import { formatCop } from '../../../lib/currency';
import { loanProgress } from '../../../domain/derived';
import { estimatePayoffMonths } from '../../../domain/loanProjection';
import { addMonths, currentMonthKey, formatMonthLabel } from '../../../lib/date';
import type { LoanCardProps } from './LoanCardProps';

// Crédito grande con barra de amortización y fecha estimada de pago (CLAUDE.md §5.6).
export function LoanCard({
  loan,
  linked,
  cuotaPaid,
  monthLabel,
  onPay,
  onUndoCuota,
  onEdit,
  onReconcile,
  onArchive,
  onDelete,
}: LoanCardProps) {
  const progress = loanProgress(loan);
  const pct = Math.round(progress * 100);
  const paid = loan.originalAmount - loan.cachedBalance;

  const months = estimatePayoffMonths(loan);
  const payoffLabel =
    months === null
      ? '—'
      : months === 0
        ? 'Pagado'
        : formatMonthLabel(addMonths(currentMonthKey(), months));

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-800">{loan.name}</p>
        <ActionMenu
          ariaLabel={`Acciones de ${loan.name}`}
          items={[
            { label: 'Editar', icon: Pencil, onSelect: onEdit },
            { label: 'Reconciliar', icon: Scale, onSelect: onReconcile },
            { label: 'Archivar', icon: Archive, onSelect: onArchive },
            { label: 'Eliminar', icon: Trash2, onSelect: onDelete, danger: true },
          ]}
        />
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Vas en {formatCop(paid)} de {formatCop(loan.originalAmount)} ({pct}%)
      </p>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-xs text-slate-400">Saldo</dt>
          <dd className="text-sm font-medium text-red-600">{formatCop(loan.cachedBalance)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Cuota</dt>
          <dd className="text-sm font-medium text-slate-700">{formatCop(loan.monthlyPayment)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Pago est.</dt>
          <dd className="text-sm font-medium text-slate-700 capitalize">{payoffLabel}</dd>
        </div>
      </dl>

      {/* Cuota del mes ligada a un fijo (§5.6): muestra a qué mes corresponde y si está paga. */}
      {linked && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500">
            Cuota de <span className="capitalize">{monthLabel}</span>
          </span>
          {cuotaPaid ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              Pagada
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Pendiente
            </span>
          )}
        </div>
      )}

      {linked && cuotaPaid ? (
        <button
          type="button"
          onClick={onUndoCuota}
          className="mt-2 w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600"
        >
          Deshacer pago de la cuota
        </button>
      ) : (
        <button
          type="button"
          onClick={onPay}
          className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white"
        >
          Pagar cuota
        </button>
      )}
    </li>
  );
}
