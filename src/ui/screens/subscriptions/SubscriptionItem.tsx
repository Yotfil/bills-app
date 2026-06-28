import { TrendingUp, Bell, Flag } from 'lucide-react';
import { formatCop } from '../../../lib/currency';
import type { SubscriptionItemProps } from './SubscriptionItemProps';

// Una fila de suscripción (§15): nombre, monto mensual y badges de gestión (subió de precio,
// renueva pronto, candidata a cancelar). Tocar la tarjeta abre el registro de la categoría; el
// botón de "candidata a cancelar" no propaga el clic.
function renewalLabel(days: number): string {
  if (days === 0) return 'renueva hoy';
  if (days === 1) return 'renueva en 1 día';
  return `renueva en ${days} días`;
}

export function SubscriptionItem({
  row,
  daysUntilRenewal,
  onToggleCancel,
  onOpen,
}: SubscriptionItemProps) {
  const { name, monthlyAmount, cancelCandidate, priceIncrease } = row;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        className="flex w-full cursor-pointer items-start justify-between rounded-xl border border-slate-200 bg-white p-4 text-left"
      >
        <div className="min-w-0">
          <span className="block font-medium text-slate-800">{name}</span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {priceIncrease && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                <TrendingUp className="h-3 w-3" /> subió {formatCop(priceIncrease.delta)}
              </span>
            )}
            {daysUntilRenewal !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                <Bell className="h-3 w-3" /> {renewalLabel(daysUntilRenewal)}
              </span>
            )}
            {cancelCandidate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                <Flag className="h-3 w-3" /> candidata a cancelar
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 pl-3">
          <span className="font-semibold text-slate-800">{formatCop(monthlyAmount)}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCancel(!cancelCandidate);
            }}
            className={`rounded-lg px-2 py-1 text-xs font-medium ${
              cancelCandidate
                ? 'bg-rose-50 text-rose-700'
                : 'border border-slate-200 text-slate-500'
            }`}
          >
            {cancelCandidate ? 'No cancelar' : 'Revisar'}
          </button>
        </div>
      </div>
    </li>
  );
}
