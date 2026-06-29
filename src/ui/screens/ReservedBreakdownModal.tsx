import { Modal } from '../components/Modal';
import { formatCop } from '../../lib/currency';
import { formatMonthLabel } from '../../lib/date';
import type { ReservedBreakdownModalProps } from './ReservedBreakdownModalProps';

// Detalle del "Reservado" de una cuenta (§5.1, §5.2): qué fijos DESTINADOS están apartando ese
// dinero, con su mes y monto, y un "Deshacer destinado" por ítem. Deshacer solo cambia el estado del
// fijo a pendiente: NO crea movimiento ni toca el Registro (el reservado es derivado). Sirve como
// válvula para ajustar un reservado que quedó colgado y no es alcanzable desde la pantalla de Fijos.
export function ReservedBreakdownModal({
  open,
  accountName,
  items,
  onUndestine,
  onClose,
}: ReservedBreakdownModalProps) {
  return (
    <Modal open={open} title={`Reservado · ${accountName}`} onClose={onClose}>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Esta cuenta ya no tiene nada reservado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((fixed) => (
            <li
              key={fixed.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">{fixed.name}</p>
                <p className="text-xs text-slate-400">
                  <span className="capitalize">{formatMonthLabel(fixed.month)}</span> ·{' '}
                  {formatCop(fixed.budgetedAmount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUndestine(fixed)}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                Deshacer destinado
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-400">
        Deshacer un destinado libera lo reservado sin crear ningún movimiento.
      </p>
    </Modal>
  );
}
