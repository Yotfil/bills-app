import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useFixedMonthly } from '../../hooks/useFixedMonthly';
import { useSessionStore } from '../../../store/sessionStore';
import { useFixedSyncStore } from '../../../store/fixedSyncStore';
import { EMPTY_FIXED_FILTER, matchesFixedFilter, type FixedFilter } from '../../../domain/fixedFilters';
import { matchesQuery } from '../../../lib/text';
import { fixedTotals, mutedPendingTotal } from '../../../domain/fixed';
import { budgetStatus } from '../../../domain/reports';
import { budgetChecklistTotals, isBudgetItem } from '../../../domain/checklistBudgets';
import {
  computeFixedSyncDiff,
  fixedSyncChangeCount,
  hasFixedSyncChanges,
} from '../../../domain/fixedTemplateSync';
import { currentMonthKey, transactionPeriodMonth } from '../../../lib/date';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeCards } from '../../../data/cardRepository';
import { subscribeLoans } from '../../../data/loanRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import {
  setBudgetManualPaid,
  setBudgetMonthOverride,
  subscribeBudgets,
} from '../../../data/budgetRepository';
import { subscribeFixedTemplates } from '../../../data/fixedTemplateRepository';
import {
  addFixedMonthlyFromTemplates,
  clearFixedMonthly,
  deleteFixedMonthly,
  generateFixedMonthly,
  markFixedAllocated,
  markFixedPaidWithoutTransaction,
  markFixedPending,
  payFixed,
  revertFixedPayment,
  updateMonthlyFromTemplate,
} from '../../../data/fixedMonthlyRepository';
import type { PayFixedInput } from '../../../data/PayFixedInput';
import type { FixedSyncSelection } from './FixedSyncModalProps';
import type {
  Account,
  Budget,
  Category,
  CreditCard,
  EntityRef,
  FixedObligationMonthly,
  FixedObligationTemplate,
  FixedStatus,
  Loan,
  Transaction,
} from '../../../domain/types';

// Orden de lectura: lo que falta primero, lo pagado al final.
const STATUS_ORDER: Record<FixedStatus, number> = { pending: 0, allocated: 1, paid: 2 };

export type FixedTab = 'gastos' | 'presupuestos';

// Criterios de orden de la lista. "status" (por defecto) deja lo pendiente primero y lo pagado al
// final (la esencia del checklist). "category" agrupa por categoría y dentro ordena por nombre.
export type FixedSort = 'status' | 'name-asc' | 'name-desc' | 'category';

/**
 * Toda la lógica de la pantalla de Fijos (§8.3): suscripciones, derivados, estado de UI (tab, búsqueda,
 * filtros, selección, "apagar") y handlers de acciones. La pantalla y sus sub-componentes solo
 * consumen lo que esto devuelve. Mantiene `FijosScreen` como orquestador, sin lógica.
 */
export function useFijos() {
  const uid = useSessionStore((s) => s.user?.uid);
  const [month, setMonth] = useState(currentMonthKey());
  const { items: fijos, loading } = useFixedMonthly(month);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans } = useUserCollection<Loan>(subscribeLoans);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: templates } = useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const { items: budgets } = useUserCollection<Budget>(subscribeBudgets);
  const [paying, setPaying] = useState<FixedObligationMonthly | null>(null);
  const [allocating, setAllocating] = useState<FixedObligationMonthly | null>(null);
  // Presupuesto cuyo tope de ESTE mes se está editando (override por mes). El tope vive en el `Budget`.
  const [editingBudgetCap, setEditingBudgetCap] = useState<Budget | null>(null);
  const [generating, setGenerating] = useState(false);
  // Tab inicial desde la URL (?tab=presupuestos) para poder enlazar directo; luego es estado interno.
  const [params] = useSearchParams();
  const [tab, setTab] = useState<FixedTab>(
    params.get('tab') === 'presupuestos' ? 'presupuestos' : 'gastos',
  );
  // Buscador independiente por tab (§8.3): cada lista conserva su propio texto.
  const [searchByTab, setSearchByTab] = useState<Record<FixedTab, string>>({
    gastos: '',
    presupuestos: '',
  });
  const search = searchByTab[tab];
  const setSearch = (value: string) => setSearchByTab((prev) => ({ ...prev, [tab]: value }));
  const [sort, setSort] = useState<FixedSort>('status');
  const [gastoFilter, setGastoFilter] = useState<FixedFilter>(EMPTY_FIXED_FILTER);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  // "Apagar" gastos (§8.3): selección EFÍMERA (no se guarda) para el cálculo temporal de Por destinar.
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const toggleMute = (id: string) =>
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // El "apagar" es temporal: al cambiar de mes se resetea (cada mes empieza sin apagados).
  const changeMonth = (m: string) => {
    setMonth(m);
    setMutedIds(new Set());
  };
  const [syncOpen, setSyncOpen] = useState(false);
  // Descarte del banner de sincronización, por mes (persistido en localStorage).
  const dismissed = useFixedSyncStore((s) => !!s.dismissedMonths[month]);
  const dismissSync = useFixedSyncStore((s) => s.dismiss);
  const undismissSync = useFixedSyncStore((s) => s.undismiss);
  // Selección para acciones masivas (§8.3): eliminar y marcar pagados sin movimiento.
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  // Fijos que CONSUMEN de un presupuesto de checklist (§5.9 ext.): se anidan bajo ese presupuesto.
  // Un ítem "huérfano" (su categoría no tiene presupuesto de checklist) NO se anida: cae en Gastos.
  const isNested = (f: FixedObligationMonthly) =>
    isBudgetItem(f) && checklistCategoryIds.has(f.categoryId);

  const gastosItems = activeFijos.filter((f) => !isNested(f));
  const gastosCount = gastosItems.length;
  const presupuestosCount = inChecklistBudgets.length;

  const checklistBudgetsShown = inChecklistBudgets
    .filter((b) => matchesQuery(search, categoryName(b.categoryId) ?? ''))
    .sort((a, b) =>
      (categoryName(a.categoryId) ?? '').localeCompare(categoryName(b.categoryId) ?? ''),
    );

  const compareFixed = (a: FixedObligationMonthly, b: FixedObligationMonthly): number => {
    if (sort === 'name-asc') return a.name.localeCompare(b.name);
    if (sort === 'name-desc') return b.name.localeCompare(a.name);
    if (sort === 'category')
      return groupLabel(a).localeCompare(groupLabel(b)) || a.name.localeCompare(b.name);
    // 'status': lo pendiente primero, lo pagado al final; desempata por nombre.
    return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name);
  };

  const sorted = gastosItems
    .filter((f) => matchesQuery(search, f.name) && matchesFixedFilter(f, gastoFilter))
    .sort(compareFixed);

  // Opciones de los filtros (§8.3): solo las categorías y medios presentes entre los gastos del mes.
  const gastoCategoryOptions = Array.from(
    new Map(
      gastosItems
        .filter((f) => f.categoryId)
        .map((f) => [f.categoryId, categoryName(f.categoryId) ?? f.categoryId]),
    ),
    ([value, label]) => ({ value, label }),
  );
  const methodLabel = (ref: EntityRef): string => {
    if (ref.kind === 'account') return accounts.find((a) => a.id === ref.id)?.name ?? 'Cuenta';
    if (ref.kind === 'card') return `${cards.find((c) => c.id === ref.id)?.name ?? 'Tarjeta'} (TC)`;
    return 'Otro';
  };
  const gastoMethodOptions = Array.from(
    new Map(
      gastosItems.map((f) => [
        `${f.paymentMethod.kind}:${f.paymentMethod.id}`,
        methodLabel(f.paymentMethod),
      ]),
    ),
    ([value, label]) => ({ value, label }),
  );

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

  // "Apagados": aporte a Por destinar de los gastos apagados (§8.3). Cálculo temporal.
  const apagados = mutedPendingTotal(gastosItems, (id) => mutedIds.has(id));

  const activeTemplates = templates.filter((t) => t.active && !t.archived);
  const unpaid = gastosItems.filter((f) => f.status !== 'paid');

  // Diferencias plantilla→mes (§5.10).
  const syncDiff = computeFixedSyncDiff(templates, activeFijos);
  const hasSyncChanges = activeFijos.length > 0 && hasFixedSyncChanges(syncDiff);
  const syncCount = fixedSyncChangeCount(syncDiff);

  // Si el mes quedó sin cambios, se "reabre" el banner para que cambios nuevos se vuelvan a mostrar.
  useEffect(() => {
    if (!hasSyncChanges && dismissed) undismissSync(month);
  }, [hasSyncChanges, dismissed, month, undismissSync]);

  // La selección se cuenta solo sobre lo VISIBLE (respeta el buscador y los filtros).
  const selectedFijos = sorted.filter((f) => selected.has(f.id));
  const allVisibleSelected = sorted.length > 0 && selectedFijos.length === sorted.length;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) sorted.forEach((f) => next.delete(f.id));
      else sorted.forEach((f) => next.add(f.id));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleBulkMarkPaid() {
    if (!uid) return;
    const targets = selectedFijos.filter((f) => f.status !== 'paid');
    if (targets.length === 0) {
      clearSelection();
      return;
    }
    if (
      !confirm(`¿Marcar ${targets.length} fijo(s) como pagados, sin crear movimientos ni tocar saldos?`)
    ) {
      return;
    }
    await Promise.all(targets.map((f) => markFixedPaidWithoutTransaction(uid, f.id)));
    clearSelection();
  }

  async function handleBulkDelete() {
    if (!uid || selectedFijos.length === 0) return;
    const targets = selectedFijos;
    if (
      !confirm(
        `¿Eliminar ${targets.length} fijo(s) de este mes? Si alguno tenía movimiento, se revertirá (el dinero vuelve a su cuenta). No se puede deshacer.`,
      )
    ) {
      return;
    }
    await Promise.all(targets.map((f) => deleteFixedMonthly(uid, f)));
    clearSelection();
  }

  async function handleMarkAllPaid() {
    if (!uid || unpaid.length === 0) return;
    if (
      !confirm(`¿Marcar ${unpaid.length} fijos como pagados, sin crear movimientos ni tocar saldos?`)
    ) {
      return;
    }
    await Promise.all(unpaid.map((f) => markFixedPaidWithoutTransaction(uid, f.id)));
  }

  // Vaciar el mes: borra TODOS los fijos del mes (deja "Generar" como un mes nuevo). No toca presupuestos.
  async function handleClearMonth() {
    if (!uid || fijos.length === 0) return;
    if (
      !confirm(
        `¿Vaciar este mes? Se eliminan TODOS los fijos del mes (los pagados revierten su movimiento). La plantilla y los presupuestos no se tocan.`,
      )
    ) {
      return;
    }
    await clearFixedMonthly(uid, month);
  }

  async function handleGenerate() {
    if (!uid) return;
    setGenerating(true);
    try {
      await generateFixedMonthly(uid, month);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePay(input: PayFixedInput) {
    if (!uid || !paying) return;
    await payFixed(uid, paying, input);
  }

  // Destinar eligiendo la cuenta de la que se reserva (§5.2): fija el medio y marca 'allocated'.
  async function handleAllocate(account: EntityRef) {
    if (!uid || !allocating) return;
    await markFixedAllocated(uid, allocating.id, account);
  }

  // Editar el tope de un presupuesto para ESTE mes (override): no toca la base ni otros meses.
  async function handleEditBudgetCap(amount: number) {
    if (!uid || !editingBudgetCap) return;
    await setBudgetMonthOverride(uid, editingBudgetCap.id, month, amount);
  }

  async function handleBudgetMarkPaid(budget: Budget) {
    if (!uid) return;
    await setBudgetManualPaid(uid, budget.id, month, true);
  }
  async function handleBudgetUndoPaid(budget: Budget) {
    if (!uid) return;
    await setBudgetManualPaid(uid, budget.id, month, false);
  }

  // Aplica solo lo que el usuario marcó en el modal de sincronización (§5.10).
  async function handleApplySync(sel: FixedSyncSelection) {
    if (!uid) return;
    const addTemplates = syncDiff.toAdd.filter((t) => sel.add.has(t.id));
    await Promise.all([
      ...(addTemplates.length ? [addFixedMonthlyFromTemplates(uid, month, addTemplates)] : []),
      ...syncDiff.toUpdate
        .filter((c) => sel.update.has(c.fixed.id))
        .map((c) => updateMonthlyFromTemplate(uid, c.fixed.id, c.template)),
      ...syncDiff.toRemove.filter((f) => sel.remove.has(f.id)).map((f) => deleteFixedMonthly(uid, f)),
    ]);
  }

  async function handleRevert(fixed: FixedObligationMonthly) {
    if (!uid) return;
    const msg = fixed.transactionId
      ? '¿Deshacer el pago? Se eliminará el movimiento y el dinero volverá a la cuenta de origen.'
      : '¿Deshacer? Volverá a pendiente (no hubo movimiento, no se devuelve dinero).';
    if (!confirm(msg)) return;
    await revertFixedPayment(uid, fixed);
  }

  // Props de una fila de fijo (§8.3). `nested` = ítem del checklist de una bolsa (indentado y sin
  // checkbox/ojo de selección masiva: se paga desde su presupuesto). Evita drillear 8 callbacks.
  const rowProps = (fixed: FixedObligationMonthly, opts?: { nested?: boolean }) => ({
    fixed,
    nested: opts?.nested,
    selected: opts?.nested ? undefined : selected.has(fixed.id),
    onToggleSelect: opts?.nested ? undefined : () => toggleOne(fixed.id),
    muted: opts?.nested ? undefined : mutedIds.has(fixed.id),
    onToggleMute: opts?.nested ? undefined : () => toggleMute(fixed.id),
    onAllocate: () => setAllocating(fixed),
    onUnallocate: () => uid && markFixedPending(uid, fixed.id),
    onPay: () => setPaying(fixed),
    onMarkPaid: () => uid && markFixedPaidWithoutTransaction(uid, fixed.id),
    onRevert: () => handleRevert(fixed),
  });

  const activeAccounts = accounts.filter((a) => !a.archived);
  const activeCards = cards.filter((c) => !c.archived);
  const activeLoans = loans.filter((l) => !l.archived);

  return {
    // estado base
    loading,
    month,
    changeMonth,
    fijos,
    activeFijos,
    tab,
    setTab,
    // totales
    totals,
    apagados,
    // tabs / listas
    gastosCount,
    presupuestosCount,
    sorted,
    checklistBudgetsShown,
    consumedForCategory,
    categoryName,
    compareFixed,
    rowProps,
    // búsqueda / filtros / orden
    search,
    setSearch,
    sort,
    setSort,
    gastoFilter,
    setGastoFilter,
    filtersExpanded,
    setFiltersExpanded,
    gastoCategoryOptions,
    gastoMethodOptions,
    // selección masiva
    selected,
    selectedFijos,
    allVisibleSelected,
    toggleAllVisible,
    clearSelection,
    unpaid,
    handleMarkAllPaid,
    handleBulkMarkPaid,
    handleBulkDelete,
    // generar / vaciar
    activeTemplates,
    generating,
    handleGenerate,
    handleClearMonth,
    // sincronización
    syncDiff,
    hasSyncChanges,
    syncCount,
    dismissed,
    dismissSync,
    syncOpen,
    setSyncOpen,
    handleApplySync,
    // modales / acciones
    paying,
    setPaying,
    handlePay,
    allocating,
    setAllocating,
    handleAllocate,
    editingBudgetCap,
    setEditingBudgetCap,
    handleEditBudgetCap,
    handleBudgetMarkPaid,
    handleBudgetUndoPaid,
    // colecciones para modales
    accounts: activeAccounts,
    cards: activeCards,
    loans: activeLoans,
    allCards: cards,
    allLoans: loans,
    categories,
  };
}
