import { Pencil, Archive, Trash2 } from 'lucide-react';
import { ActionMenu } from '../../components/ActionMenu';
import { formatCop } from '../../../lib/currency';
import type { BudgetTemplateCardProps } from './BudgetTemplateCardProps';

// Tarjeta de presupuesto en la PLANTILLA (CLAUDE.md §5.9): muestra solo el tope BASE (con lo que
// arranca cada mes), SIN barra de consumo. El consumo y el ajuste por mes se ven en /fijos.
export function BudgetTemplateCard({
  categoryName,
  base,
  linkedToFixed = false,
  onEdit,
  onArchive,
  onDelete,
}: BudgetTemplateCardProps) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-semibold text-slate-800">{categoryName}</p>
          {linkedToFixed && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              Fijo ligado
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">{formatCop(base)} · base cada mes</p>
      </div>
      <ActionMenu
        ariaLabel={`Acciones de ${categoryName}`}
        items={[
          { label: 'Editar', icon: Pencil, onSelect: onEdit },
          { label: 'Archivar', icon: Archive, onSelect: onArchive },
          { label: 'Eliminar', icon: Trash2, onSelect: onDelete, danger: true },
        ]}
      />
    </li>
  );
}
