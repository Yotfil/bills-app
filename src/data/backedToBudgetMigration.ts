// Migración NO destructiva (Opción C, §5.9): el "fijo respaldado" deja de ser un fijo y pasa a ser un
// `Budget` marcado `inChecklist`. Aquí se prepara el dato SIN borrar nada: por cada plantilla
// respaldada, se marca su `Budget` como de checklist; y por cada instancia mensual respaldada que
// estaba "ya pagada (sin movimiento)", se copia ese estado a `Budget.manualPaidMonths`. Idempotente:
// si ya está marcado, no escribe. Los fijos respaldados viejos quedan dormidos (se borran en un PR
// posterior). Tras esto, la app lee los presupuestos de checklist desde el `Budget`.
import { getDocs, query, where } from 'firebase/firestore';
import { budgetsCol, fixedMonthlyCol, fixedTemplatesCol } from './collections';
import { listAll } from './crud';
import { setBudgetInChecklist, setBudgetManualPaid } from './budgetRepository';
import { budgetForCategory } from '../domain/budgetBackedFixed';

/** Forma legacy del fijo del mes respaldado (campo `budgetBacked` que se quitará en el PR de limpieza). */
type LegacyBackedMonthly = {
  categoryId: string;
  month: string;
  status: string;
  transactionId: string | null;
};

/** Devuelve cuántas escrituras hizo (0 si ya estaba todo migrado). */
export async function migrateBackedToBudgets(uid: string): Promise<number> {
  const templates = await listAll(fixedTemplatesCol(uid));
  const backedCategories = new Set(
    templates
      .filter((t) => !t.archived && (t.budgetBacked ?? false))
      .map((t) => t.categoryId),
  );
  if (backedCategories.size === 0) return 0;

  const budgets = await listAll(budgetsCol(uid));
  let writes = 0;

  // 1) Marcar como "de checklist" el Budget de cada categoría que tenía plantilla respaldada.
  for (const categoryId of backedCategories) {
    const budget = budgetForCategory(categoryId, budgets);
    if (budget && !budget.inChecklist) {
      await setBudgetInChecklist(uid, budget.id, true);
      writes += 1;
    }
  }

  // 2) Copiar el "ya estaba pagado (sin movimiento)" por mes de los fijos respaldados al Budget.
  const snap = await getDocs(query(fixedMonthlyCol(uid), where('budgetBacked', '==', true)));
  for (const d of snap.docs) {
    const m = d.data() as unknown as LegacyBackedMonthly;
    if (m.status !== 'paid' || m.transactionId != null) continue; // solo "pagado a mano"
    const budget = budgetForCategory(m.categoryId, budgets);
    if (!budget || budget.manualPaidMonths?.[m.month]) continue; // ya migrado
    await setBudgetManualPaid(uid, budget.id, m.month, true);
    writes += 1;
  }

  return writes;
}
