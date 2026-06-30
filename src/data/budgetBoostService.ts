// Aplica/revierte los aumentos de presupuesto ligados a un ingreso (§5.9). Cada aumento sube (o baja,
// al revertir) el tope del mes del presupuesto, horneándolo en su `monthlyOverrides` para que el tope
// siga teniendo una sola fuente (`budgetCapForMonth`). Lo usa `transactionService` al crear/editar/
// borrar un ingreso, así el aumento queda LIGADO: borrar el ingreso lo revierte.
import { getBudget, setBudgetMonthOverride } from './budgetRepository';
import { boostedOverride, budgetCapForMonth } from '../domain/checklistBudgets';
import type { BudgetBoost } from '../domain/types';

/** sign = +1 aplica el aumento; sign = -1 lo revierte. Lee cada presupuesto y ajusta el override del
 * mes. Ignora boosts cuyo presupuesto ya no existe (defensivo). */
export async function applyBudgetBoosts(
  uid: string,
  boosts: BudgetBoost[] | undefined,
  sign: 1 | -1,
): Promise<void> {
  if (!boosts || boosts.length === 0) return;
  for (const boost of boosts) {
    const budget = await getBudget(uid, boost.budgetId);
    if (!budget) continue;
    const next = boostedOverride(
      budgetCapForMonth(budget, boost.month),
      budget.monthlyLimit,
      boost.amount,
      sign,
    );
    await setBudgetMonthOverride(uid, boost.budgetId, boost.month, next);
  }
}
