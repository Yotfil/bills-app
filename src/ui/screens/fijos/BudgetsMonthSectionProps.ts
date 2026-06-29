import type { Budget, Transaction } from '../../../domain/types';

export interface BudgetsMonthSectionProps {
  /** Mes 'YYYY-MM' que se está viendo. */
  month: string;
  /** Presupuestos NORMALES (no respaldados) a mostrar en el mes. */
  budgets: Budget[];
  /** Movimientos del mes contable (para calcular el consumo por categoría). */
  monthTxns: Transaction[];
  categoryNameOf: (categoryId: string) => string;
  /** Abrir la edición del tope de ese mes (override) de un presupuesto. */
  onEditCap: (budget: Budget) => void;
  /** Quitar el override del mes (vuelve a la base). */
  onResetCap: (budget: Budget) => void;
}
