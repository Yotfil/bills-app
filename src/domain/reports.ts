// Reportes de gasto, etiqueta hormiga y presupuestos (CLAUDE.md §5.4, §5.8, §5.9).
//
// REGLA DE ORO (§5.4): "¿en qué se me va el dinero?" cuenta SOLO los gastos reales
// (expense). transfer, debt_payment y adjustment NUNCA aparecen como gasto.
import { HORMIGA_TAG, type TransactionDraft } from './types';
import type { BudgetStatus } from './BudgetStatus';

export type { BudgetStatus } from './BudgetStatus';

/** ¿Esta transacción cuenta como gasto en los reportes? Solo los expense (§5.4). */
export function isSpendTransaction(txn: TransactionDraft): boolean {
  return txn.type === 'expense';
}

/** Total de gasto real de un conjunto de movimientos. */
export function totalSpend(transactions: TransactionDraft[]): number {
  return transactions.filter(isSpendTransaction).reduce((sum, t) => sum + t.amount, 0);
}

/** Gasto agrupado por categoría (solo expense). Las sin categoría se ignoran. */
export function spendByCategory(transactions: TransactionDraft[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const txn of transactions) {
    if (!isSpendTransaction(txn) || !txn.categoryId) continue;
    result[txn.categoryId] = (result[txn.categoryId] ?? 0) + txn.amount;
  }
  return result;
}

/** Total de "gasto hormiga": gastos con la etiqueta, cruzando todas las categorías (§5.8). */
export function totalHormiga(transactions: TransactionDraft[]): number {
  return transactions
    .filter((t) => isSpendTransaction(t) && t.tags.includes(HORMIGA_TAG))
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Estado de un presupuesto de categoría (§5.9): consumido = Σ gastos de esa categoría;
 * restante = tope − consumido (puede ser negativo si se superó).
 */
export function budgetStatus(
  transactions: TransactionDraft[],
  categoryId: string,
  monthlyLimit: number,
): BudgetStatus {
  const consumed = transactions
    .filter((t) => isSpendTransaction(t) && t.categoryId === categoryId)
    .reduce((sum, t) => sum + t.amount, 0);
  return {
    limit: monthlyLimit,
    consumed,
    remaining: monthlyLimit - consumed,
    exceeded: consumed > monthlyLimit,
  };
}
