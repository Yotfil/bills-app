// Orquesta el vínculo fijo ↔ presupuesto (CLAUDE.md §5.9). El vínculo es IMPLÍCITO por categoría:
// un fijo `budgetBacked` (gasto) está ligado al presupuesto ACTIVO de su misma categoría. Mantiene
// en espejo el monto del fijo del mes (M) y el tope del presupuesto (B), sin tocar la plantilla (T).
// Reglas (T = plantilla, M = fijo del mes, B = tope del presupuesto):
//   - Editar T (o generar el mes): B = T.            -> alignBudgetToTemplate
//   - Editar M (mes en curso):     B = M.            -> syncBudgetFromMonthly
//   - Editar B (presupuestos):     M (mes en curso) = B. -> syncMonthlyFromBudget
// No tocan saldos: el gasto real son los movimientos de la categoría (que consumen el presupuesto).
import { listAll } from './crud';
import { budgetsCol } from './collections';
import { updateBudget } from './budgetRepository';
import { listFixedMonthlyForMonth, syncMonthlyAmount } from './fixedMonthlyRepository';
import { budgetForCategory } from '../domain/budgetBackedFixed';
import type { Budget, FixedObligationMonthly } from '../domain/types';

/** Lo mínimo que define la liga de una plantilla con su presupuesto (§5.9). */
export interface BudgetBackedRef {
  budgetBacked: boolean;
  payKind: 'expense' | 'debt_payment';
  categoryId: string;
  budgetedAmount: number;
}

/** Presupuesto activo de una categoría (o null), leído de Firestore. */
async function activeBudgetForCategory(uid: string, categoryId: string): Promise<Budget | null> {
  const budgets = await listAll(budgetsCol(uid));
  return budgetForCategory(categoryId, budgets);
}

/**
 * Alinea el tope del presupuesto al monto de la plantilla (B = T) para un fijo respaldado. Se llama
 * al editar/marcar la plantilla y al generar los fijos del mes. No-op si el fijo no es respaldado o
 * la categoría no tiene presupuesto (la liga solo existe cuando hay presupuesto, §5.9).
 */
export async function alignBudgetToTemplate(uid: string, ref: BudgetBackedRef): Promise<void> {
  if (!ref.budgetBacked || ref.payKind !== 'expense') return;
  const budget = await activeBudgetForCategory(uid, ref.categoryId);
  if (!budget || budget.monthlyLimit === ref.budgetedAmount) return;
  await updateBudget(uid, budget.id, { monthlyLimit: ref.budgetedAmount });
}

/**
 * Espejo M → B: al editar el monto del fijo del mes (respaldado), actualiza el tope del presupuesto
 * de su categoría. No toca la plantilla.
 */
export async function syncBudgetFromMonthly(
  uid: string,
  fixed: FixedObligationMonthly,
  amount: number,
): Promise<void> {
  if (!fixed.budgetBacked) return;
  const budget = await activeBudgetForCategory(uid, fixed.categoryId);
  if (!budget || budget.monthlyLimit === amount) return;
  await updateBudget(uid, budget.id, { monthlyLimit: amount });
}

/**
 * Espejo B → M: al editar el tope del presupuesto, actualiza el monto de los fijos respaldados de
 * esa categoría en el mes en curso (no pagados). No toca la plantilla. Lee los fijos del mes solo.
 */
export async function syncMonthlyFromBudget(
  uid: string,
  budget: Budget,
  amount: number,
  month: string,
): Promise<void> {
  const monthlies = await listFixedMonthlyForMonth(uid, month);
  const linked = monthlies.filter((m) => m.budgetBacked && m.categoryId === budget.categoryId);
  await Promise.all(
    linked
      .filter((m) => m.budgetedAmount !== amount)
      .map((m) => syncMonthlyAmount(uid, m.templateId, month, amount)),
  );
}
