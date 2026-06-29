import type { Budget, Category } from '../../../domain/types';

export interface BudgetFormProps {
  open: boolean;
  budget?: Budget | null;
  categories: Category[];
  /** Categorías que ya tienen presupuesto (se excluyen al crear uno nuevo). */
  usedCategoryIds: string[];
  onClose: () => void;
}
