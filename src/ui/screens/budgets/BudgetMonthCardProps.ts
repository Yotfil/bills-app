import type { BudgetStatus } from '../../../domain/reports';

export interface BudgetMonthCardProps {
  categoryName: string;
  /** Estado del presupuesto en ESE mes (consumo vs tope efectivo del mes). */
  status: BudgetStatus;
  /** Si este mes tiene un override (tope distinto a la base). */
  overridden: boolean;
  onEditCap: () => void;
  /** Quitar el override y volver a la base (solo cuando `overridden`). */
  onResetCap: () => void;
}
