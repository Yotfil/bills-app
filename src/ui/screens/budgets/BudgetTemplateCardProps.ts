export interface BudgetTemplateCardProps {
  categoryName: string;
  /** Tope BASE (con lo que arranca cada mes). */
  base: number;
  /** Si la categoría tiene un fijo respaldado ("Fijo ligado"). */
  linkedToFixed?: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}
