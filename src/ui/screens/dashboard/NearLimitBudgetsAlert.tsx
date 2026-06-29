import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCop } from '../../../lib/currency';
import type { NearLimitBudgetsAlertProps } from './NearLimitBudgetsAlertProps';

// Alerta preventiva en el Inicio (CLAUDE.md §8.1, §5.9): topes que están muy cerca de excederse (sin
// pasarse aún). Tono naranja (menos grave que la de excedidos, roja). Solo aparece si hay alguno.
export function NearLimitBudgetsAlert({ items }: NearLimitBudgetsAlertProps) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-orange-300 bg-orange-50 p-4">
      <div className="flex items-center gap-2 text-orange-700">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <h2 className="text-sm font-semibold">
          {items.length === 1
            ? 'Estás muy cerca de exceder un tope'
            : `Estás muy cerca de exceder ${items.length} topes`}
        </h2>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-orange-800">{item.categoryName}</span>
            <span className="shrink-0 font-semibold text-orange-600">
              quedan {formatCop(item.remaining)}
            </span>
          </li>
        ))}
      </ul>
      <Link
        to="/fijos?tab=presupuestos"
        className="mt-2 inline-block text-xs font-medium text-orange-700 underline"
      >
        Ver presupuestos
      </Link>
    </section>
  );
}
