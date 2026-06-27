import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCop } from '../../../lib/currency';
import type { ExceededBudgetsAlertProps } from './ExceededBudgetsAlertProps';

// Alerta de topes excedidos en el Inicio (CLAUDE.md §8.1, §5.9). Solo aparece cuando hay al menos un
// fijo respaldado cuyo gasto superó su tope, para que el usuario sepa de un vistazo cuáles cuidar.
export function ExceededBudgetsAlert({ items }: ExceededBudgetsAlertProps) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-red-300 bg-red-50 p-4">
      <div className="flex items-center gap-2 text-red-700">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <h2 className="text-sm font-semibold">
          {items.length === 1 ? 'Te pasaste de un tope' : `Te pasaste de ${items.length} topes`}
        </h2>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-red-800">{item.categoryName}</span>
            <span className="shrink-0 font-semibold text-red-600">
              +{formatCop(item.overspend)}
            </span>
          </li>
        ))}
      </ul>
      <Link
        to="/mas/presupuestos"
        className="mt-2 inline-block text-xs font-medium text-red-700 underline"
      >
        Ver presupuestos
      </Link>
    </section>
  );
}
