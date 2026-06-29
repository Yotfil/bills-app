// Migración única (Opción B, §5.9): el tope de los presupuestos respaldados pasa a vivir en su
// `Budget`. Antes el tope del mes vivía en el fijo respaldado (`budgetedAmount` base + `capOverride`).
// Aquí se copia el tope EFECTIVO de cada fijo respaldado al `Budget.monthlyOverrides` de su mes, solo
// cuando difiere del que ya tiene el budget. Es IDEMPOTENTE: no cambia ningún valor visible y, corrida
// de nuevo, no escribe nada. Tras esto, la app lee el tope solo del `Budget`.
import { getDocs, query, where } from 'firebase/firestore';
import { budgetsCol, fixedMonthlyCol } from './collections';
import { listAll } from './crud';
import { setBudgetMonthOverride } from './budgetRepository';
import { budgetCapForMonth, budgetForCategory } from '../domain/budgetBackedFixed';

/** Forma legacy del fijo del mes: incluye el `capOverride` que ya no está en el tipo de dominio. */
type LegacyMonthly = {
  categoryId: string;
  month: string;
  budgetedAmount: number;
  capOverride?: number | null;
};

/** Devuelve cuántos overrides escribió (0 si ya estaba todo migrado). */
export async function migrateBudgetCapsToBudgets(uid: string): Promise<number> {
  const snap = await getDocs(query(fixedMonthlyCol(uid), where('budgetBacked', '==', true)));
  if (snap.empty) return 0;
  const budgets = await listAll(budgetsCol(uid));
  let written = 0;
  await Promise.all(
    snap.docs.map(async (d) => {
      const m = d.data() as unknown as LegacyMonthly;
      const budget = budgetForCategory(m.categoryId, budgets);
      if (!budget) return;
      const fixedCap = m.capOverride ?? m.budgetedAmount;
      // Idempotente: si el budget ya da ese tope para el mes, no escribir.
      if (budgetCapForMonth(budget, m.month) === fixedCap) return;
      await setBudgetMonthOverride(uid, budget.id, m.month, fixedCap);
      written += 1;
    }),
  );
  return written;
}
