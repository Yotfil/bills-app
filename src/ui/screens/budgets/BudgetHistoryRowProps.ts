import type { BudgetStatus } from '../../../domain/reports';

export interface BudgetHistoryRowProps {
  categoryName: string;
  status: BudgetStatus;
  /** `true` si el tope de ese mes venía de un fijo respaldado (§5.9). */
  linkedToFixed?: boolean;
}
