// Repositorio de presupuestos por categoría (CLAUDE.md §5.9, §8.4). El consumo (Σ gastos de
// la categoría en el mes) es DERIVADO; aquí solo se guarda el tope y la categoría.
import { budgetsCol } from './collections';
import { archive, create, subscribeAll, update, type CreateInput, type UpdateInput } from './crud';
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

export const archiveBudget = (uid: string, id: string) => archive(budgetsCol(uid), id);
