// Fijos respaldados por presupuesto (CLAUDE.md §5.9). Lógica PURA. Un fijo "budget-backed" no se
// paga con un movimiento: su gasto real son los movimientos de su categoría (que consumen el
// presupuesto). Se marca "lleno" cuando el consumo alcanza el tope. Su valor va en espejo con el
// tope del presupuesto de su categoría (la liga es por `categoryId`).
import type { Budget, FixedObligationMonthly, FixedStatus } from './types';

/** `true` si el item (plantilla o fijo del mes) está marcado como respaldado por presupuesto. */
export function isBudgetBacked(item: { budgetBacked: boolean }): boolean {
  return item.budgetBacked;
}

/**
 * `true` si el fijo CONSUME de un presupuesto (es un ítem del checklist de una bolsa, §5.9 ext.):
 * descuenta la bolsa de su categoría al pagarse y NO suma aparte a los totales de fijos.
 */
export function isBudgetItem(item: { consumesBudget?: boolean }): boolean {
  return item.consumesBudget === true;
}

/**
 * Los ítems del checklist que cuelgan del presupuesto de una categoría en el mes: los fijos que
 * CONSUMEN de esa bolsa (no el respaldado, que ES la bolsa). `monthlies` = fijos de un solo mes.
 */
export function linkedBudgetItems(
  categoryId: string,
  monthlies: FixedObligationMonthly[],
): FixedObligationMonthly[] {
  return monthlies.filter((m) => isBudgetItem(m) && !m.budgetBacked && m.categoryId === categoryId);
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
 * El fijo respaldado de una categoría en el mes dado, o null. Indica que la categoría TIENE un
 * presupuesto respaldado este mes (la "bolsa"); el tope en sí vive en el `Budget` de la categoría
 * (`budgetCapForMonth`), no en el fijo. `monthlies` = fijos de un solo mes.
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
 * Monto que un fijo respaldado aporta a los totales (§5.9): el gasto real (`consumed`) si está
 * lleno/excedido (así Pagado incluye el sobrepaso), o el tope (`cap`) si en curso (Por destinar).
 */
export function budgetBackedTotalAmount(consumed: number, cap: number): number {
  return budgetBackedFilled(consumed, cap) ? consumed : cap;
}

/** Un tope excedido: el fijo respaldado, su gasto y por cuánto se pasó del tope. */
export interface ExceededBudgetBacked {
  fixed: FixedObligationMonthly;
  consumed: number;
  overspend: number; // consumed - cap (> 0)
}

/**
 * Fijos respaldados cuyo gasto SUPERÓ el tope (consumed > cap), con el sobrepaso. Para la alerta del
 * dashboard (§8.1). `consumedOf` da el gasto del mes por categoría; `capOf` da el tope del mes por
 * categoría (vive en el `Budget`, §5.9).
 */
export function exceededBudgetBacked(
  monthlies: FixedObligationMonthly[],
  consumedOf: (categoryId: string) => number,
  capOf: (categoryId: string) => number,
): ExceededBudgetBacked[] {
  const result: ExceededBudgetBacked[] = [];
  for (const fixed of monthlies) {
    if (!fixed.budgetBacked) continue;
    const consumed = consumedOf(fixed.categoryId);
    const cap = capOf(fixed.categoryId);
    if (consumed > cap) {
      result.push({ fixed, consumed, overspend: consumed - cap });
    }
  }
  return result;
}

/** Un tope cerca de excederse: el fijo respaldado, su gasto y cuánto le queda al tope. */
export interface NearLimitBudgetBacked {
  fixed: FixedObligationMonthly;
  consumed: number;
  remaining: number; // cap - consumed (>= 0)
}

/**
 * Fijos respaldados MUY CERCA de excederse: gasto por encima de `ratio` del tope pero **sin** pasarse
 * (consumed ≤ cap). Para la alerta preventiva del dashboard (§8.1). Excluye los ya excedidos (esos
 * van en `exceededBudgetBacked`), así cada tope aparece en una sola sección.
 */
export function nearLimitBudgetBacked(
  monthlies: FixedObligationMonthly[],
  consumedOf: (categoryId: string) => number,
  capOf: (categoryId: string) => number,
  ratio: number,
): NearLimitBudgetBacked[] {
  const result: NearLimitBudgetBacked[] = [];
  for (const fixed of monthlies) {
    if (!fixed.budgetBacked) continue;
    const cap = capOf(fixed.categoryId);
    if (cap <= 0) continue;
    const consumed = consumedOf(fixed.categoryId);
    if (consumed > ratio * cap && consumed <= cap) {
      result.push({ fixed, consumed, remaining: cap - consumed });
    }
  }
  return result;
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
  // "Ya estaba pagado (sin movimiento)": un respaldado puede marcarse pagado a mano (status guardado
  // 'paid') aunque su gasto no alcance el tope — útil para meses que ya estaban saldados al empezar a
  // usar la app. Ese override manda sobre el cálculo por consumo.
  if (fixed.status === 'paid') return 'paid';
  return filledByCategory(fixed.categoryId) ? 'paid' : 'pending';
}

/**
 * Monto que aporta un respaldado a los totales contemplando el "pagado manual": si se marcó pagado
 * sin movimiento (status 'paid') cuenta su TOPE como pagado (no su consumo, que puede ser 0). Si no,
 * usa la regla normal por consumo (§5.9). `cap` es el tope del mes (del `Budget` de la categoría).
 */
export function budgetBackedAmount(
  fixed: FixedObligationMonthly,
  consumed: number,
  cap: number,
): number {
  if (fixed.status === 'paid') return cap;
  return budgetBackedTotalAmount(consumed, cap);
}
