import type { Budget, FixedObligationMonthly } from '../../../domain/types';
import type { FixedRowProps } from './FixedRowProps';

export interface FixedBudgetsTabProps {
  budgets: Budget[]; // presupuestos de checklist a mostrar (ya filtrados/ordenados)
  month: string;
  activeFijos: FixedObligationMonthly[]; // para resolver los ítems anidados (consumesBudget)
  consumedForCategory: (categoryId: string) => number;
  compareFixed: (a: FixedObligationMonthly, b: FixedObligationMonthly) => number;
  categoryName: (categoryId: string) => string | undefined;
  onEditCap: (budget: Budget) => void;
  onBudgetMarkPaid: (budget: Budget) => void;
  onBudgetUndoPaid: (budget: Budget) => void;
  // Props de una fila de fijo (incluye los callbacks de pago/destinar). Para los ítems anidados.
  rowProps: (fixed: FixedObligationMonthly, opts?: { nested?: boolean }) => FixedRowProps;
}
