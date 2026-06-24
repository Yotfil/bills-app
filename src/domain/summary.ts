// Resumen del mes (CLAUDE.md §8.1). Función pura sobre un conjunto de movimientos (ya
// filtrados por periodo). Reutiliza la regla de oro de reportes: gastos = solo expense.
import { totalSpend } from './reports';
import type { TransactionDraft } from './types';
import type { MonthlySummary } from './MonthlySummary';

export type { MonthlySummary } from './MonthlySummary';

export function monthlySummary(transactions: TransactionDraft[]): MonthlySummary {
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = totalSpend(transactions);
  return { income, expense, flow: income - expense };
}
