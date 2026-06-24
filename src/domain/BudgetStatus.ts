// Estado de un presupuesto de categoría (CLAUDE.md §5.9).
export interface BudgetStatus {
  limit: number;
  consumed: number;
  remaining: number;
  exceeded: boolean;
}
