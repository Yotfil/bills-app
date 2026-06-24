import type { BudgetStatus } from '../../../domain/reports';

export interface BudgetCardProps {
  categoryName: string;
  status: BudgetStatus;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}
