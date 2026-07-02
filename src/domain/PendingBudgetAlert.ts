// Un aviso de tope aún no confirmado por el usuario (CLAUDE.md §5.9). Lo produce
// `computePendingBudgetAlerts` y lo consume el pop-up de alertas (BudgetAlertWatcher).
export type PendingBudgetAlertLevel = 'near' | 'exceeded';

export interface PendingBudgetAlert {
  key: string; // `${mes}:${budgetId}` — la misma clave que usa el store de confirmados
  level: PendingBudgetAlertLevel;
  categoryName: string;
  consumed: number;
  cap: number;
}
