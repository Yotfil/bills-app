import type { Budget, Category, FixedObligationMonthly } from '../../../domain/types';

export interface BudgetFormProps {
  open: boolean;
  budget?: Budget | null;
  categories: Category[];
  /** Categorías que ya tienen presupuesto (se excluyen al crear uno nuevo). */
  usedCategoryIds: string[];
  /**
   * Fijo respaldado del mes en curso ligado a este presupuesto, si existe (§5.9). Sirve para avisar,
   * al editar la BASE, que este mes tiene un override puntual que se conserva (se cambia en Fijos).
   */
  linkedFixed?: FixedObligationMonthly | null;
  onClose: () => void;
}
