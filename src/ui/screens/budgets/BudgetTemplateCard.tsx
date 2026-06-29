import { Pencil, Archive, Trash2 } from 'lucide-react';
import { ActionMenu } from '../../components/ActionMenu';
import { formatCop } from '../../../lib/currency';
import type { BudgetTemplateCardProps } from './BudgetTemplateCardProps';

// Tarjeta de presupuesto en la PLANTILLA (CLAUDE.md §5.9): muestra solo el tope BASE (con lo que
// arranca cada mes), SIN barra de consumo. El consumo y el ajuste por mes se ven en /fijos.
export function BudgetTemplateCard({
  categoryName,
  base,
  inChecklist,
  onToggleChecklist,
  onEdit,
  onArchive,
  onDelete,
}: BudgetTemplateCardProps) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">{categoryName}</p>
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
      </div>
      {/* "Mostrar en Fijos": el presupuesto aparece en el checklist mensual y su tope cuenta en
          "Por destinar"/"Pagado" (§5.9). */}
      <label className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={inChecklist}
          onChange={(e) => onToggleChecklist(e.target.checked)}
          className="h-4 w-4 shrink-0 accent-slate-800"
        />
        Mostrar en Fijos (checklist)
      </label>
    </li>
  );
}
