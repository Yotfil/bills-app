import { formatCop } from '../../../lib/currency';
import type { BudgetCardProps } from './BudgetCardProps';

// Tarjeta de presupuesto con progreso y aviso suave (CLAUDE.md §5.9). Calma, no culpa (§2):
// verde mientras hay margen, ámbar cerca del tope, rojo si se superó.
export function BudgetCard({ categoryName, status, onEdit, onArchive }: BudgetCardProps) {
  const ratio = status.limit > 0 ? status.consumed / status.limit : 0;
  const pct = Math.min(100, Math.round(ratio * 100));
  const near = ratio >= 0.8 && !status.exceeded;

  const barColor = status.exceeded ? 'bg-red-500' : near ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-800">{categoryName}</p>
        <div className="flex gap-2 text-sm">
          <button type="button" onClick={onEdit} className="text-slate-500 underline">
            Editar
          </button>
          <button type="button" onClick={onArchive} className="text-slate-400 underline">
            Archivar
          </button>
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {formatCop(status.consumed)} de {formatCop(status.limit)}
        </span>
        <span className={status.exceeded ? 'font-medium text-red-600' : 'text-slate-400'}>
          {status.exceeded
            ? `Te pasaste ${formatCop(-status.remaining)}`
            : `Quedan ${formatCop(status.remaining)}`}
        </span>
      </div>

      {near && <p className="mt-1 text-xs text-amber-600">Vas cerca del tope.</p>}
    </li>
  );
}
