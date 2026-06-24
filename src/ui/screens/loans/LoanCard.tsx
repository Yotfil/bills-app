import { formatCop } from '../../../lib/currency';
import { loanProgress } from '../../../domain/derived';
import { estimatePayoffMonths } from '../../../domain/loanProjection';
import { addMonths, currentMonthKey, formatMonthLabel } from '../../../lib/date';
import type { LoanCardProps } from './LoanCardProps';

// Crédito grande con barra de amortización y fecha estimada de pago (CLAUDE.md §5.6).
export function LoanCard({ loan, onPay, onEdit, onArchive, onDelete }: LoanCardProps) {
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
        <div className="flex gap-2 text-sm">
          <button type="button" onClick={onEdit} className="text-slate-500 underline">
            Editar
          </button>
          <button type="button" onClick={onArchive} className="text-slate-400 underline">
            Archivar
          </button>
          <button type="button" onClick={onDelete} className="text-red-500 underline">
            Eliminar
          </button>
        </div>
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

      <button
        type="button"
        onClick={onPay}
        className="mt-3 w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-white"
      >
        Pagar cuota
      </button>
    </li>
  );
}
