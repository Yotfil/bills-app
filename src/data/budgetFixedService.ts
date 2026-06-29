// Orquesta el vínculo fijo ↔ presupuesto (CLAUDE.md §5.9). El vínculo es IMPLÍCITO por categoría:
// un fijo `budgetBacked` (gasto) está ligado al presupuesto ACTIVO de su misma categoría. Hay DOS
// "topes" que se editan distinto (T = plantilla, M = fijo del mes, B = tope del presupuesto):
//   - BASE recurrente (con lo que arranca cada mes): editable desde Presupuestos o la plantilla.
//     -> `setBudgetBackedBase` deja T = B = base, y la base de M en el mes en curso y futuros.
//   - OVERRIDE de solo ese mes (`capOverride` de M): editable desde Fijos ("Editar tope").
//     -> `setFixedCapOverride` (fixedMonthlyRepository); ortogonal a la base, no la toca.
//   - Al generar el mes / rollover: B = T -> `alignBudgetToTemplate`.
// No tocan saldos: el gasto real son los movimientos de la categoría (que consumen el presupuesto).
import { listAll } from './crud';
import { budgetsCol, fixedTemplatesCol } from './collections';
import { updateBudget } from './budgetRepository';
import { updateFixedTemplate } from './fixedTemplateRepository';
import { setBudgetBackedBaseAmount } from './fixedMonthlyRepository';
import { budgetForCategory } from '../domain/budgetBackedFixed';
import type { Budget } from '../domain/types';

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
 * Cambia la BASE recurrente del tope respaldado de una categoría (§5.9): el valor con el que arranca
 * cada mes. Deja en `newBase` el tope del presupuesto (B), el monto de la(s) plantilla(s) respaldada(s)
 * (T) y la base de los fijos del mes en curso y futuros (M.budgetedAmount). NO toca los `capOverride`
 * por mes (los ajustes de un mes puntual se conservan) ni los meses pasados. Si la categoría no tiene
 * fijo respaldado (presupuesto "normal"), solo actualiza B.
 */
export async function setBudgetBackedBase(
  uid: string,
  categoryId: string,
  newBase: number,
): Promise<void> {
  const budget = await activeBudgetForCategory(uid, categoryId);
  if (budget && budget.monthlyLimit !== newBase) {
    await updateBudget(uid, budget.id, { monthlyLimit: newBase });
  }
  const templates = await listAll(fixedTemplatesCol(uid));
  const backed = templates.filter(
    (t) => !t.archived && (t.budgetBacked ?? false) && t.categoryId === categoryId,
  );
  await Promise.all(
    backed.map(async (t) => {
      if (t.budgetedAmount !== newBase) {
        await updateFixedTemplate(uid, t.id, { budgetedAmount: newBase });
      }
      await setBudgetBackedBaseAmount(uid, t.id, newBase);
    }),
  );
}
