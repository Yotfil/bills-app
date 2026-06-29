export interface BudgetTemplateCardProps {
  categoryName: string;
  /** Tope BASE (con lo que arranca cada mes). */
  base: number;
  /** Si el presupuesto aparece en el checklist de Fijos y cuenta en los totales (§5.9). */
  inChecklist: boolean;
  onToggleChecklist: (value: boolean) => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}
