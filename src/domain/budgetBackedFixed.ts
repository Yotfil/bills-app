// Fijos respaldados por presupuesto (CLAUDE.md §5.9). Lógica PURA. Un fijo "budget-backed" no se
// paga con un movimiento: su gasto real son los movimientos de su categoría (que consumen el
// presupuesto). Se marca "lleno" cuando el consumo alcanza el tope. Su valor va en espejo con el
// tope del presupuesto de su categoría (la liga es por `categoryId`).
import type { Budget, FixedObligationMonthly, FixedStatus } from './types';

/** `true` si el item (plantilla o fijo del mes) está marcado como respaldado por presupuesto. */
export function isBudgetBacked(item: { budgetBacked: boolean }): boolean {
  return item.budgetBacked;
}

/** El presupuesto ACTIVO de una categoría, o null si no hay (la liga es 1:1 por categoría). */
export function budgetForCategory(categoryId: string, budgets: Budget[]): Budget | null {
  return budgets.find((b) => !b.archived && b.active && b.categoryId === categoryId) ?? null;
}

/**
 * El fijo respaldado de una categoría en el mes dado, o null. El tope POR MES vive en este fijo
 * (`budgetedAmount` = M), así que es la fuente de verdad del tope de esa categoría ese mes (§5.9):
 * la tarjeta del presupuesto lee de aquí para el mes en curso. `monthlies` = fijos de un solo mes.
 */
export function linkedBudgetBackedFixed(
  categoryId: string,
  monthlies: FixedObligationMonthly[],
): FixedObligationMonthly | null {
  return monthlies.find((m) => m.budgetBacked && m.categoryId === categoryId) ?? null;
}

/** `true` si el presupuesto está lleno: lo consumido alcanzó (o superó) el tope. */
export function budgetBackedFilled(consumed: number, cap: number): boolean {
  return cap > 0 && consumed >= cap;
}

/**
 * Estado EFECTIVO de un fijo para los totales (§8.3). Un fijo respaldado no usa la máquina de
 * estados normal: deriva su estado del consumo del presupuesto ('paid' si está lleno, 'pending' si
 * no; nunca 'allocated', no se "destina" un tope). Un fijo normal conserva su `status` guardado.
 * `filledByCategory` indica, por categoryId, si el presupuesto de esa categoría está lleno.
 */
export function effectiveFixedStatus(
  fixed: FixedObligationMonthly,
  filledByCategory: (categoryId: string) => boolean,
): FixedStatus {
  if (!fixed.budgetBacked) return fixed.status;
  return filledByCategory(fixed.categoryId) ? 'paid' : 'pending';
}
