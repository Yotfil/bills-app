import { useUserCollection } from '../../hooks/useUserCollection';
import { useFixedMonthly } from '../../hooks/useFixedMonthly';
import { fixedTotals } from '../../../domain/fixed';
import { budgetStatus } from '../../../domain/reports';
import { budgetChecklistTotals, isBudgetItem } from '../../../domain/checklistBudgets';
import {
  computeFixedSyncDiff,
  fixedSyncChangeCount,
  hasFixedSyncChanges,
} from '../../../domain/fixedTemplateSync';
import { transactionPeriodMonth } from '../../../lib/date';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeCards } from '../../../data/cardRepository';
import { subscribeLoans } from '../../../data/loanRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import { subscribeBudgets } from '../../../data/budgetRepository';
import { subscribeFixedTemplates } from '../../../data/fixedTemplateRepository';
import type {
  Account,
  Budget,
  Category,
  CreditCard,
  EntityRef,
  FixedObligationMonthly,
  FixedObligationTemplate,
  Loan,
  Transaction,
} from '../../../domain/types';

/**
 * Capa de DATOS de la pantalla de Fijos (§8.3): suscripciones a Firestore y derivados puros del
 * mes (totales, ítems por tab, diff de sincronización). Sin estado de UI ni handlers: eso vive en
 * `useFijosFilters` / `useFijosActions`; `useFijos` compone los tres.
 */
export function useFijosData(month: string) {
  const { items: fijos, loading } = useFixedMonthly(month);
  const { items: rawAccounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: rawCards } = useUserCollection<CreditCard>(subscribeCards);
  const { items: rawLoans } = useUserCollection<Loan>(subscribeLoans);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: templates } = useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: budgets } = useUserCollection<Budget>(subscribeBudgets);

  // Consumo de presupuesto: por MES CONTABLE (periodMonth), no por la fecha de caja (§5.9).
  const monthTxns = transactions.filter((t) => transactionPeriodMonth(t) === month);
  const consumedForCategory = (categoryId: string) =>
    budgetStatus(monthTxns, categoryId, 0).consumed;
  const activeFijos = fijos;

  // En /fijos SOLO aparecen los presupuestos marcados "Mostrar en Fijos" (inChecklist).
  const activeBudgets = budgets.filter((b) => !b.archived && b.active);
  const inChecklistBudgets = activeBudgets.filter((b) => b.inChecklist);
  const checklistCategoryIds = new Set(inChecklistBudgets.map((b) => b.categoryId));

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name;
  const groupLabel = (f: FixedObligationMonthly) =>
    f.payKind === 'debt_payment' ? 'Abono a deuda' : (categoryName(f.categoryId) ?? 'Sin categoría');
  const methodLabel = (ref: EntityRef): string => {
    if (ref.kind === 'account') return rawAccounts.find((a) => a.id === ref.id)?.name ?? 'Cuenta';
    if (ref.kind === 'card')
      return `${rawCards.find((c) => c.id === ref.id)?.name ?? 'Tarjeta'} (TC)`;
    return 'Otro';
  };

  // Fijos que CONSUMEN de un presupuesto de checklist (§5.9 ext.): se anidan bajo ese presupuesto.
  // Un ítem "huérfano" (su categoría no tiene presupuesto de checklist) NO se anida: cae en Gastos.
  const isNested = (f: FixedObligationMonthly) =>
    isBudgetItem(f) && checklistCategoryIds.has(f.categoryId);

  const gastosItems = activeFijos.filter((f) => !isNested(f));
  const gastosCount = gastosItems.length;
  const presupuestosCount = inChecklistBudgets.length;

  // Totales = gastos (sin anidados) + presupuestos de checklist (su tope cuenta; nunca 'allocated').
  const fixedPart = fixedTotals(gastosItems);
  const budgetPart = budgetChecklistTotals(inChecklistBudgets, month, consumedForCategory);
  const totals = {
    pendingAmount: fixedPart.pendingAmount + budgetPart.pendingAmount,
    allocatedAmount: fixedPart.allocatedAmount,
    paidAmount: fixedPart.paidAmount + budgetPart.paidAmount,
    counts: {
      pending: fixedPart.counts.pending + budgetPart.pendingCount,
      allocated: fixedPart.counts.allocated,
      paid: fixedPart.counts.paid + budgetPart.paidCount,
      total: fixedPart.counts.total + budgetPart.pendingCount + budgetPart.paidCount,
    },
  };

  const activeTemplates = templates.filter((t) => t.active && !t.archived);
  const unpaid = gastosItems.filter((f) => f.status !== 'paid');

  // Diferencias plantilla→mes (§5.10).
  const syncDiff = computeFixedSyncDiff(templates, activeFijos);
  const hasSyncChanges = activeFijos.length > 0 && hasFixedSyncChanges(syncDiff);
  const syncCount = fixedSyncChangeCount(syncDiff);

  return {
    loading,
    fijos,
    activeFijos,
    consumedForCategory,
    categoryName,
    groupLabel,
    methodLabel,
    inChecklistBudgets,
    gastosItems,
    gastosCount,
    presupuestosCount,
    totals,
    activeTemplates,
    unpaid,
    syncDiff,
    hasSyncChanges,
    syncCount,
    // Colecciones para modales/selectores (mismas claves que expone useFijos).
    accounts: rawAccounts.filter((a) => !a.archived),
    cards: rawCards.filter((c) => !c.archived),
    loans: rawLoans.filter((l) => !l.archived),
    allCards: rawCards,
    allLoans: rawLoans,
    categories,
  };
}
