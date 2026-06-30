// Presupuestos en el checklist de Fijos (CLAUDE.md §5.9, Opción C). Lógica PURA. Un presupuesto con
// `inChecklist` aparece como ítem del checklist mensual: no se paga con un movimiento; su gasto real
// son los movimientos de su categoría y su tope (por mes) vive en el `Budget`. Aquí viven los helpers
// de tope por mes, estado/totales del checklist y los aumentos ligados a ingresos.
import type { Budget, FixedObligationMonthly, FixedStatus } from './types';

/**
 * `true` si el fijo CONSUME de un presupuesto (es un ítem del checklist de una bolsa, §5.9 ext.):
 * descuenta la bolsa de su categoría al pagarse y NO suma aparte a los totales de fijos.
 */
export function isBudgetItem(item: { consumesBudget?: boolean }): boolean {
  return item.consumesBudget === true;
}

/**
 * Los ítems del checklist que cuelgan del presupuesto de una categoría en el mes: los fijos que
 * CONSUMEN de esa bolsa. `monthlies` = fijos de un solo mes.
 */
export function linkedBudgetItems(
  categoryId: string,
  monthlies: FixedObligationMonthly[],
): FixedObligationMonthly[] {
  return monthlies.filter((m) => isBudgetItem(m) && m.categoryId === categoryId);
}

/** El presupuesto ACTIVO de una categoría, o null si no hay (la liga es 1:1 por categoría). */
export function budgetForCategory(categoryId: string, budgets: Budget[]): Budget | null {
  return budgets.find((b) => !b.archived && b.active && b.categoryId === categoryId) ?? null;
}

/**
 * Tope EFECTIVO de un presupuesto NORMAL para un mes (§5.9): el override de ese mes si existe, o la
 * base (`monthlyLimit`). Análogo a `fixedCap` para respaldados; permite editar un mes sin afectar la
 * base ni los demás meses.
 */
export function budgetCapForMonth(
  budget: { monthlyOverrides?: Record<string, number>; monthlyLimit: number },
  month: string,
): number {
  return budget.monthlyOverrides?.[month] ?? budget.monthlyLimit;
}

/**
 * Nuevo valor del override del mes al aplicar (sign +1) o revertir (sign -1) un aumento ligado a un
 * ingreso (§5.9): suma/resta `amount` al tope efectivo actual. Si el resultado vuelve a la base,
 * devuelve `null` para LIMPIAR el override (mantenerlo limpio). `currentCap` = `budgetCapForMonth`.
 */
export function boostedOverride(
  currentCap: number,
  base: number,
  amount: number,
  sign: 1 | -1,
): number | null {
  const next = currentCap + sign * amount;
  return next === base ? null : next;
}

/** `true` si el presupuesto de checklist está lleno: lo consumido alcanzó (o superó) el tope. */
export function budgetFilled(consumed: number, cap: number): boolean {
  return cap > 0 && consumed >= cap;
}

/** Un tope excedido: el presupuesto de checklist, su gasto y por cuánto se pasó del tope. */
export interface ExceededBudget {
  budget: Budget;
  consumed: number;
  overspend: number; // consumed - cap (> 0)
}

/**
 * Presupuestos de checklist cuyo gasto SUPERÓ el tope del mes (consumed > cap), con el sobrepaso.
 * Para la alerta del dashboard (§8.1). `consumedOf` da el gasto del mes por categoría.
 */
export function exceededChecklistBudgets(
  budgets: Budget[],
  month: string,
  consumedOf: (categoryId: string) => number,
): ExceededBudget[] {
  const result: ExceededBudget[] = [];
  for (const budget of budgets) {
    if (!budget.inChecklist) continue;
    const consumed = consumedOf(budget.categoryId);
    const cap = budgetCapForMonth(budget, month);
    if (consumed > cap) result.push({ budget, consumed, overspend: consumed - cap });
  }
  return result;
}

/** Un tope cerca de excederse: el presupuesto de checklist, su gasto y cuánto le queda al tope. */
export interface NearLimitBudget {
  budget: Budget;
  consumed: number;
  remaining: number; // cap - consumed (>= 0)
}

/**
 * Presupuestos de checklist MUY CERCA de excederse: gasto por encima de `ratio` del tope pero **sin**
 * pasarse (consumed ≤ cap). Para la alerta preventiva del dashboard (§8.1). Excluye los ya excedidos.
 */
export function nearLimitChecklistBudgets(
  budgets: Budget[],
  month: string,
  consumedOf: (categoryId: string) => number,
  ratio: number,
): NearLimitBudget[] {
  const result: NearLimitBudget[] = [];
  for (const budget of budgets) {
    if (!budget.inChecklist) continue;
    const cap = budgetCapForMonth(budget, month);
    if (cap <= 0) continue;
    const consumed = consumedOf(budget.categoryId);
    if (consumed > ratio * cap && consumed <= cap) {
      result.push({ budget, consumed, remaining: cap - consumed });
    }
  }
  return result;
}

// ---------- Presupuesto de checklist (Opción C, §5.9) ----------
// Un presupuesto con `inChecklist` aparece en el checklist de Fijos y su tope cuenta en los totales,
// igual que el viejo "fijo respaldado" pero viviendo en el `Budget`. No se paga con un movimiento; su
// gasto real son los movimientos de su categoría. Estado y monto se derivan del consumo + el tope del
// mes (`budgetCapForMonth`) y del "ya estaba pagado" por mes (`manualPaidMonths`).

/** `true` si el presupuesto se marcó "ya estaba pagado (sin movimiento)" en ese mes. */
export function budgetManuallyPaid(budget: Budget, month: string): boolean {
  return budget.manualPaidMonths?.[month] === true;
}

/** Estado EFECTIVO de un presupuesto de checklist en el mes: 'paid' si está lleno o marcado pagado
 * a mano; si no, 'pending' (nunca 'allocated': un tope no se "destina"). */
export function budgetChecklistStatus(budget: Budget, month: string, consumed: number): FixedStatus {
  if (budgetManuallyPaid(budget, month)) return 'paid';
  return budgetFilled(consumed, budgetCapForMonth(budget, month)) ? 'paid' : 'pending';
}

/** Aporte de los presupuestos de checklist a los totales del mes (§8.3): por destinar (en curso) y
 * pagado (lleno/pagado a mano). Se SUMA a `fixedTotals` (los presupuestos nunca quedan 'allocated'). */
export interface BudgetChecklistTotals {
  pendingAmount: number;
  paidAmount: number;
  pendingCount: number;
  paidCount: number;
}

export function budgetChecklistTotals(
  budgets: Budget[],
  month: string,
  consumedOf: (categoryId: string) => number,
): BudgetChecklistTotals {
  const totals: BudgetChecklistTotals = {
    pendingAmount: 0,
    paidAmount: 0,
    pendingCount: 0,
    paidCount: 0,
  };
  for (const budget of budgets) {
    if (!budget.inChecklist) continue;
    const cap = budgetCapForMonth(budget, month);
    const consumed = consumedOf(budget.categoryId);
    if (budgetManuallyPaid(budget, month)) {
      // Pagado a mano: todo el tope cuenta como pagado.
      totals.paidAmount += cap;
      totals.paidCount += 1;
      continue;
    }
    // Reparto GRADUAL (§5.9): lo ya gastado de la categoría cuenta como "Pagado" y lo que falta del
    // tope como "Por destinar". Así "Por destinar" baja a medida que se gasta, sin esperar a "Lleno".
    totals.paidAmount += consumed; // gasto real (incluye sobrepaso si lo hay)
    totals.pendingAmount += Math.max(cap - consumed, 0);
    if (budgetFilled(consumed, cap)) totals.paidCount += 1;
    else totals.pendingCount += 1;
  }
  return totals;
}
