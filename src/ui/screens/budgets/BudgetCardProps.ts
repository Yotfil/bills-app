import type { BudgetStatus } from '../../../domain/reports';

export interface BudgetCardProps {
  categoryName: string;
  status: BudgetStatus;
  /** `true` si el tope viene de un fijo respaldado del mes en curso (§5.9). */
  linkedToFixed?: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}
