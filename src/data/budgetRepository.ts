// Repositorio de presupuestos por categoría (CLAUDE.md §5.9, §8.4). El consumo (Σ gastos de
// la categoría en el mes) es DERIVADO; aquí solo se guarda el tope y la categoría.
import {
  deleteField,
  doc,
  serverTimestamp,
  updateDoc,
  type DocumentReference,
} from 'firebase/firestore';
import { budgetsCol } from './collections';
import {
  archive,
  create,
  hardDelete,
  subscribeAll,
  unarchive,
  update,
  type CreateInput,
  type UpdateInput,
} from './crud';
import type { NewBudget } from './NewBudget';
import type { Budget } from '../domain/types';

export type { NewBudget } from './NewBudget';

/** Construye el documento a crear (función pura, testeable). */
export function buildBudgetCreateInput(input: NewBudget): CreateInput<Budget> {
  return {
    categoryId: input.categoryId,
    monthlyLimit: input.monthlyLimit,
    active: input.active ?? true,
    archived: false,
    archivedAt: null,
  };
}

export const subscribeBudgets = (uid: string, onChange: (items: Budget[]) => void) =>
  subscribeAll(budgetsCol(uid), onChange);

export const createBudget = (uid: string, input: NewBudget) =>
  create(budgetsCol(uid), buildBudgetCreateInput(input));

export const updateBudget = (uid: string, id: string, data: UpdateInput<Budget>) =>
  update(budgetsCol(uid), id, data);

/** Ref sin converter para tocar un campo anidado del mapa de overrides con FieldValue. */
function rawBudgetDoc(uid: string, id: string): DocumentReference {
  return doc(budgetsCol(uid), id) as unknown as DocumentReference;
}

/**
 * Fija el override del tope de un presupuesto para UN mes ('YYYY-MM'), o lo quita con `null` (ese mes
 * vuelve a la base `monthlyLimit`). Solo toca esa entrada del mapa `monthlyOverrides`: ni la base ni
 * los otros meses (§5.9). Se edita desde la vista mensual (/fijos).
 */
export const setBudgetMonthOverride = (
  uid: string,
  id: string,
  month: string,
  value: number | null,
) =>
  updateDoc(rawBudgetDoc(uid, id), {
    [`monthlyOverrides.${month}`]: value === null ? deleteField() : value,
    updatedAt: serverTimestamp(),
  });

export const archiveBudget = (uid: string, id: string) => archive(budgetsCol(uid), id);

export const unarchiveBudget = (uid: string, id: string) => unarchive(budgetsCol(uid), id);

// Un presupuesto es solo un tope: ningún movimiento lo referencia, así que se puede borrar
// siempre sin romper el histórico (§8.4).
export const deleteBudget = (uid: string, id: string) => hardDelete(budgetsCol(uid), id);
