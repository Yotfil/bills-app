import { Fragment, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useFixedMonthly } from '../../hooks/useFixedMonthly';
import { useSessionStore } from '../../../store/sessionStore';
import { useFixedSyncStore } from '../../../store/fixedSyncStore';
import { MonthSelector } from '../../components/MonthSelector';
import { DisponibleRealBar } from '../../components/DisponibleRealBar';
import { SearchBar } from '../../components/SearchBar';
import { FixedFilters } from './FixedFilters';
import { FixedMutedBar } from './FixedMutedBar';
import {
  EMPTY_FIXED_FILTER,
  isFixedFilterActive,
  matchesFixedFilter,
  type FixedFilter,
} from '../../../domain/fixedFilters';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { BulkSelectBar } from '../../components/BulkSelectBar';
import { matchesQuery } from '../../../lib/text';
import { FixedTotalsBar } from './FixedTotalsBar';
import { FixedRow } from './FixedRow';
import { PayFixedModal } from './PayFixedModal';
import { AllocateFixedModal } from './AllocateFixedModal';
import { FixedSyncBanner } from './FixedSyncBanner';
import { FixedSyncModal } from './FixedSyncModal';
import { BudgetChecklistCard } from '../budgets/BudgetChecklistCard';
import { BudgetCapModal } from '../budgets/BudgetCapModal';
import { HormigaBudgetCard } from '../budgets/HormigaBudgetCard';
import { fixedTotals, mutedPendingTotal } from '../../../domain/fixed';
import { budgetStatus } from '../../../domain/reports';
import {
  budgetBackedAmount,
  budgetBackedFilled,
  budgetCapForMonth,
  budgetChecklistTotals,
  budgetForCategory,
  budgetManuallyPaid,
  effectiveFixedStatus,
  isBudgetItem,
  linkedBudgetItems,
} from '../../../domain/budgetBackedFixed';
import {
  computeFixedSyncDiff,
  fixedSyncChangeCount,
  hasFixedSyncChanges,
} from '../../../domain/fixedTemplateSync';
import {
  addMonths,
  currentMonthKey,
  formatMonthLabel,
  transactionPeriodMonth,
} from '../../../lib/date';
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
  setMonthlyBudgetBacked,
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

// Tabs internos de la pantalla (§8.3): los gastos fijos (se pagan/destinan) van separados de los
// presupuestos fijos (respaldados por presupuesto, `budgetBacked`). Ambos siguen alimentando los
// totales de arriba; los tabs solo separan la lista de abajo.
type FixedTab = 'gastos' | 'presupuestos';

// Criterios de orden de la lista. "status" (por defecto) deja lo pendiente primero y lo pagado al
// final (la esencia del checklist). "category" agrupa por categoría y dentro ordena por nombre.
type FixedSort = 'status' | 'name-asc' | 'name-desc' | 'category';

export function FijosScreen() {
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
  // Presupuesto cuyo tope de ESTE mes se está editando (override por mes). Aplica a respaldados y
  // normales por igual: el tope vive en el `Budget` (§5.9).
  const [editingBudgetCap, setEditingBudgetCap] = useState<Budget | null>(null);
  const [generating, setGenerating] = useState(false);
  // Tab inicial desde la URL (?tab=presupuestos) para poder enlazar directo (p.ej. avisos del
  // dashboard); luego se maneja como estado interno.
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
  // Selección para acciones masivas (§8.3): mismo patrón que la plantilla. Aquí hay DOS acciones,
  // eliminar y marcar pagados sin movimiento.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Fijos respaldados por presupuesto (§5.9): su gasto es Σ movimientos de la categoría este mes.
  // El tope es el del presupuesto (espejo del monto). El estado se DERIVA: lleno → cuenta como
  // pagado en los totales; en curso → como por destinar. Nunca "destinado".
  // Consumo de presupuesto: por MES CONTABLE (periodMonth), no por la fecha de caja. Así un fijo
  // pagado hoy pero perteneciente a otro mes consume el presupuesto de ese mes (§5.9).
  const monthTxns = transactions.filter((t) => transactionPeriodMonth(t) === month);
  const consumedForCategory = (categoryId: string) =>
    budgetStatus(monthTxns, categoryId, 0).consumed;
  // Tope del mes de una categoría: vive en su `Budget` (§5.9, Opción B). Para un respaldado siempre
  // hay budget; si faltara, 0 (defensivo).
  const capOf = (categoryId: string): number => {
    const b = budgetForCategory(categoryId, budgets);
    return b ? budgetCapForMonth(b, month) : 0;
  };
  // Estado efectivo: un respaldado deriva pending/paid del consumo vs el tope de su presupuesto
  // (§5.9); el resto conserva su estado guardado.
  const effectiveStatusOf = (f: FixedObligationMonthly): FixedStatus =>
    effectiveFixedStatus(f, (cat) => budgetBackedFilled(consumedForCategory(cat), capOf(cat)));
  // Monto que cada fijo aporta a los totales: un respaldado lleno/excedido aporta su gasto REAL
  // (Pagado incluye el sobrepaso, §5.9); en curso aporta su tope; el resto, su pagado/presupuestado.
  const amountOf = (f: FixedObligationMonthly): number =>
    f.budgetBacked
      ? budgetBackedAmount(f, consumedForCategory(f.categoryId), capOf(f.categoryId))
      : (f.paidAmount ?? f.budgetedAmount);

  // Fijos respaldados (Opción C, §5.9): ya NO se usan; los presupuestos viven en su `Budget`. Las
  // instancias respaldadas que aún existan (previas a la migración) quedan DORMIDAS: se ignoran en
  // listas, totales y sincronización (el PR de limpieza las borra).
  const activeFijos = fijos.filter((f) => !f.budgetBacked);

  // En /fijos SOLO aparecen los presupuestos marcados "Mostrar en Fijos" (inChecklist): cuentan en
  // los totales y anidan su bolsa. Los demás presupuestos viven solo en la Plantilla (base), no aquí.
  const activeBudgets = budgets.filter((b) => !b.archived && b.active);
  const inChecklistBudgets = activeBudgets.filter((b) => b.inChecklist);
  const checklistCategoryIds = new Set(inChecklistBudgets.map((b) => b.categoryId));

  // Etiqueta para agrupar/ordenar por categoría: los abonos a deuda no tienen categoría, así que
  // se agrupan bajo "Abono a deuda" (consistente con su subtítulo en la fila).
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name;
  const groupLabel = (f: FixedObligationMonthly) =>
    f.payKind === 'debt_payment' ? 'Abono a deuda' : (categoryName(f.categoryId) ?? 'Sin categoría');

  // Fijos que CONSUMEN de un presupuesto de checklist (§5.9 ext.): se anidan bajo ese presupuesto en
  // el tab Presupuestos. Un ítem "huérfano" (su categoría no tiene presupuesto de checklist este mes)
  // NO se anida: cae en el tab Gastos como un fijo normal para que no desaparezca.
  const isNested = (f: FixedObligationMonthly) =>
    isBudgetItem(f) && checklistCategoryIds.has(f.categoryId);

  // Tab Gastos = fijos no anidados. Tab Presupuestos = presupuestos de checklist (no fijos).
  const gastosItems = activeFijos.filter((f) => !isNested(f));
  const gastosCount = gastosItems.length;
  const presupuestosCount = inChecklistBudgets.length;

  const checklistBudgetsShown = inChecklistBudgets
    .filter((b) => matchesQuery(search, categoryName(b.categoryId) ?? ''))
    .sort((a, b) => (categoryName(a.categoryId) ?? '').localeCompare(categoryName(b.categoryId) ?? ''));

  const compareFixed = (a: FixedObligationMonthly, b: FixedObligationMonthly): number => {
    if (sort === 'name-asc') return a.name.localeCompare(b.name);
    if (sort === 'name-desc') return b.name.localeCompare(a.name);
    if (sort === 'category')
      return groupLabel(a).localeCompare(groupLabel(b)) || a.name.localeCompare(b.name);
    // 'status': lo pendiente primero, lo pagado al final; desempata por nombre.
    return (
      STATUS_ORDER[effectiveStatusOf(a)] - STATUS_ORDER[effectiveStatusOf(b)] ||
      a.name.localeCompare(b.name)
    );
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
      gastosItems.map((f) => [`${f.paymentMethod.kind}:${f.paymentMethod.id}`, methodLabel(f.paymentMethod)]),
    ),
    ([value, label]) => ({ value, label }),
  );

  // Totales = fijos (gastos, sin anidados) + presupuestos de checklist (su tope cuenta en Por
  // destinar/Pagado; nunca quedan 'allocated'). Los anidados ya están representados por su bolsa.
  const fixedPart = fixedTotals(gastosItems, effectiveStatusOf, amountOf);
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

  // "Apagados": aporte a Por destinar de los gastos apagados (§8.3). Cálculo temporal; no toca el bar
  // canónico ni los saldos.
  const apagados = mutedPendingTotal(
    gastosItems,
    (id) => mutedIds.has(id),
    effectiveStatusOf,
    amountOf,
  );

  // Plantillas que SÍ generan fijo del mes (los respaldados ya no, §5.9).
  const activeTemplates = templates.filter(
    (t) => t.active && !t.archived && !(t.budgetBacked ?? false),
  );
  const unpaid = gastosItems.filter((f) => f.status !== 'paid');

  // Diferencias plantilla→mes (§5.10), ignorando los fijos respaldados dormidos.
  const syncDiff = computeFixedSyncDiff(templates, activeFijos);
  const hasSyncChanges = activeFijos.length > 0 && hasFixedSyncChanges(syncDiff);
  const syncCount = fixedSyncChangeCount(syncDiff);

  // Si el mes quedó sin cambios (porque se aplicaron o desaparecieron), se "reabre" el banner: así,
  // si más adelante surgen cambios nuevos en este mes, se vuelve a mostrar y no solo el icono.
  useEffect(() => {
    if (!hasSyncChanges && dismissed) undismissSync(month);
  }, [hasSyncChanges, dismissed, month, undismissSync]);

  // Auto-sincroniza el MODO respaldado al abrir el mes (§5.9): si la plantilla activa pasó a (o dejó
  // de ser) respaldada y el snapshot del fijo quedó desfasado, se realinea solo el flag (no el monto
  // por-mes ni el resto: eso va por el banner). Mismo patrón que la auto-reconciliación de cuotas en
  // LoansScreen. Solo toca fijos NO pagados; converge porque la suscripción refresca tras escribir.
  useEffect(() => {
    if (!uid) return;
    for (const f of fijos) {
      if (f.status === 'paid') continue;
      const tpl = templates.find((t) => t.id === f.templateId && t.active && !t.archived);
      if (tpl && (tpl.budgetBacked ?? false) !== f.budgetBacked) {
        void setMonthlyBudgetBacked(uid, f.id, tpl.budgetBacked ?? false);
      }
    }
  }, [uid, fijos, templates]);

  // La selección se cuenta solo sobre lo VISIBLE (respeta el buscador).
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
    // Solo aplica a los que NO están pagados (marcar pagado uno ya pagado no tiene sentido).
    const targets = selectedFijos.filter((f) => f.status !== 'paid');
    if (targets.length === 0) {
      clearSelection();
      return;
    }
    if (
      !confirm(
        `¿Marcar ${targets.length} fijo(s) como pagados, sin crear movimientos ni tocar saldos?`,
      )
    ) {
      return;
    }
    await Promise.all(targets.map((f) => markFixedPaidWithoutTransaction(uid, f.id)));
    clearSelection();
  }

  async function handleBulkDelete() {
    if (!uid || selectedFijos.length === 0) return;
    // Al eliminar una bolsa (fijo respaldado) se eliminan también sus ítems ligados del mes (el
    // checklist que cuelga de ella): no tiene sentido dejar ítems sin su bolsa. Se deduplica por id.
    const withItems = new Map<string, FixedObligationMonthly>();
    for (const f of selectedFijos) {
      withItems.set(f.id, f);
      if (f.budgetBacked) {
        for (const item of linkedBudgetItems(f.categoryId, fijos)) withItems.set(item.id, item);
      }
    }
    const targets = [...withItems.values()];
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
      !confirm(
        `¿Marcar ${unpaid.length} fijos como pagados, sin crear movimientos ni tocar saldos?`,
      )
    ) {
      return;
    }
    await Promise.all(unpaid.map((f) => markFixedPaidWithoutTransaction(uid, f.id)));
  }

  // Vaciar el mes: borra TODOS los fijos del mes (deja "Generar" como un mes nuevo). Útil cuando
  // quedaron ítems de bolsa o respaldados dormidos que no se borran de a uno. No toca presupuestos.
  async function handleClearMonth() {
    if (!uid || fijos.length === 0) return;
    if (
      !confirm(
        `¿Vaciar ${formatMonthLabel(month)}? Se eliminan TODOS los fijos del mes (los pagados revierten su movimiento). La plantilla y los presupuestos no se tocan.`,
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
      // El tope de los respaldados vive en su `Budget` (§5.9), no en la plantilla: generar basta.
      await generateFixedMonthly(uid, month);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePay(input: PayFixedInput) {
    if (!uid || !paying) return;
    await payFixed(uid, paying, input);
  }

  // Destinar eligiendo la cuenta de la que se reserva (§5.2): se fija ese medio en el fijo del mes
  // y se marca 'allocated'. El reservado de esa cuenta baja su disponible (derivado, no mueve saldo).
  async function handleAllocate(account: EntityRef) {
    if (!uid || !allocating) return;
    await markFixedAllocated(uid, allocating.id, account);
  }

  // Abre la edición del tope de ESTE mes para una categoría (override). El tope vive en el `Budget`
  // (§5.9), así que respaldados y normales usan el mismo flujo.
  function openEditCapForCategory(categoryId: string) {
    const b = budgetForCategory(categoryId, budgets);
    if (b) setEditingBudgetCap(b);
  }

  // Editar el tope de un presupuesto para ESTE mes (override): no toca la base ni otros meses.
  async function handleEditBudgetCap(amount: number) {
    if (!uid || !editingBudgetCap) return;
    await setBudgetMonthOverride(uid, editingBudgetCap.id, month, amount);
  }

  // "Ya estaba pagado (sin movimiento)" de un presupuesto de checklist, por mes (§5.9).
  async function handleBudgetMarkPaid(budget: Budget) {
    if (!uid) return;
    await setBudgetManualPaid(uid, budget.id, month, true);
  }
  async function handleBudgetUndoPaid(budget: Budget) {
    if (!uid) return;
    await setBudgetManualPaid(uid, budget.id, month, false);
  }

  // Aplica solo lo que el usuario marcó en el modal de sincronización (§5.10): agrega plantillas
  // nuevas, reescribe snapshots desfasados y quita instancias cuya plantilla ya no aplica.
  async function handleApplySync(sel: FixedSyncSelection) {
    if (!uid) return;
    const addTemplates = syncDiff.toAdd.filter((t) => sel.add.has(t.id));
    await Promise.all([
      ...(addTemplates.length ? [addFixedMonthlyFromTemplates(uid, month, addTemplates)] : []),
      ...syncDiff.toUpdate
        .filter((c) => sel.update.has(c.fixed.id))
        .map((c) => updateMonthlyFromTemplate(uid, c.fixed.id, c.template)),
      ...syncDiff.toRemove
        .filter((f) => sel.remove.has(f.id))
        .map((f) => deleteFixedMonthly(uid, f)),
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

  // Renderiza una fila de fijo. `nested` = ítem del checklist de una bolsa (indentado y sin checkbox
  // de selección masiva: se paga desde su presupuesto, no entra a las acciones en lote).
  const renderRow = (fixed: FixedObligationMonthly, opts?: { nested?: boolean }) => (
    <FixedRow
      key={fixed.id}
      fixed={fixed}
      nested={opts?.nested}
      cap={fixed.budgetBacked ? capOf(fixed.categoryId) : undefined}
      budgetConsumed={fixed.budgetBacked ? consumedForCategory(fixed.categoryId) : undefined}
      onEditCap={fixed.budgetBacked ? () => openEditCapForCategory(fixed.categoryId) : undefined}
      selected={opts?.nested ? undefined : selected.has(fixed.id)}
      onToggleSelect={opts?.nested ? undefined : () => toggleOne(fixed.id)}
      muted={opts?.nested ? undefined : mutedIds.has(fixed.id)}
      onToggleMute={opts?.nested ? undefined : () => toggleMute(fixed.id)}
      onAllocate={() => setAllocating(fixed)}
      onUnallocate={() => uid && markFixedPending(uid, fixed.id)}
      onPay={() => setPaying(fixed)}
      onMarkPaid={() => uid && markFixedPaidWithoutTransaction(uid, fixed.id)}
      onRevert={() => handleRevert(fixed)}
    />
  );

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-4 pb-24">
      <DisponibleRealBar />
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Fijos</h1>
        <div className="flex items-center gap-3">
          {/* Punto de entrada al modal cuando el banner está cerrado: icono con contador. */}
          {hasSyncChanges && dismissed && (
            <button
              type="button"
              onClick={() => setSyncOpen(true)}
              aria-label={`Actualizar fijos del mes (${syncCount} cambios)`}
              className="relative text-amber-600 hover:text-amber-700"
            >
              <RefreshCw className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                {syncCount}
              </span>
            </button>
          )}
          <Link to="/mas/fijos" className="text-sm text-slate-400 underline">
            Plantilla
          </Link>
        </div>
      </header>

      <MonthSelector
        month={month}
        onPrev={() => changeMonth(addMonths(month, -1))}
        onNext={() => changeMonth(addMonths(month, 1))}
      />
      <FixedTotalsBar totals={totals} />
      {/* Cálculo temporal de "apagar" gastos (§8.3): solo en Gastos y cuando hay ≥1 apagado. */}
      {tab === 'gastos' && apagados > 0 && (
        <FixedMutedBar pending={totals.pendingAmount - apagados} muted={apagados} />
      )}

      {hasSyncChanges && !dismissed && (
        <FixedSyncBanner
          count={syncCount}
          onOpen={() => setSyncOpen(true)}
          onDismiss={() => dismissSync(month)}
        />
      )}

      {/* Vaciar el mes: deja "Generar" como un mes nuevo (borra todos los fijos del mes). */}
      {fijos.length > 0 && (
        <button
          type="button"
          onClick={() => void handleClearMonth()}
          className="self-end text-xs text-slate-400 underline"
        >
          Vaciar mes
        </button>
      )}

      {(activeFijos.length > 0 || inChecklistBudgets.length > 0) && (
        <SegmentedTabs<FixedTab>
          value={tab}
          onChange={(next) => {
            setTab(next);
            // La selección masiva es por tab: al cambiar de lista, se limpia.
            clearSelection();
          }}
          tabs={[
            { value: 'gastos', label: 'Gastos', count: gastosCount },
            { value: 'presupuestos', label: 'Presupuestos', count: presupuestosCount },
          ]}
        />
      )}

      {(tab === 'gastos' ? gastosCount > 0 : presupuestosCount > 0) && (
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={tab === 'presupuestos' ? 'Buscar presupuesto…' : 'Buscar gasto…'}
        />
      )}

      {/* Filtros (§8.3) y orden en una sola fila: toggle "Filtros ▾/▴" + Limpiar a la izquierda,
          "Ordenar" a la derecha; el panel de filtros se despliega debajo. */}
      {tab === 'gastos' && gastosCount > 0 && (
        <>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFiltersExpanded((v) => !v)}
                className="text-slate-500 underline"
              >
                Filtros {filtersExpanded ? '▴' : '▾'}
              </button>
              {isFixedFilterActive(gastoFilter) && (
                <button
                  type="button"
                  onClick={() => setGastoFilter(EMPTY_FIXED_FILTER)}
                  className="text-slate-400 underline"
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="fixed-sort" className="text-xs text-slate-400">
                Ordenar
              </label>
              <select
                id="fixed-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as FixedSort)}
                aria-label="Ordenar fijos"
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-500"
              >
                <option value="status">Estado</option>
                <option value="name-asc">Nombre A→Z</option>
                <option value="name-desc">Nombre Z→A</option>
                <option value="category">Categoría</option>
              </select>
            </div>
          </div>

          <FixedFilters
            filter={gastoFilter}
            onChange={setGastoFilter}
            categoryOptions={gastoCategoryOptions}
            methodOptions={gastoMethodOptions}
            expanded={filtersExpanded}
          />
        </>
      )}

      {/* Acciones masivas solo en Gastos: los presupuestos fijos no se pagan ni se destinan (§5.9). */}
      {tab === 'gastos' && (
        <>
          {unpaid.length > 1 && selected.size === 0 && (
            <button
              type="button"
              onClick={handleMarkAllPaid}
              className="text-center text-sm text-slate-500 underline"
            >
              Marcar los {unpaid.length} como pagados (sin movimiento)
            </button>
          )}

          <BulkSelectBar
            selectedCount={selectedFijos.length}
            totalCount={sorted.length}
            allSelected={allVisibleSelected}
            onToggleAll={toggleAllVisible}
            actions={[
              { label: 'Marcar pagados', onClick: () => void handleBulkMarkPaid() },
              { label: 'Eliminar', danger: true, onClick: () => void handleBulkDelete() },
            ]}
          />
        </>
      )}

      {loading && <p className="text-slate-400">Cargando…</p>}

      {!loading && fijos.length === 0 && tab === 'gastos' && (
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
          {activeTemplates.length > 0 ? (
            <>
              <p className="text-slate-500">No has generado los fijos de este mes.</p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="mt-3 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Generar {activeTemplates.length} fijos del mes
              </button>
            </>
          ) : (
            <p className="text-slate-500">
              Aún no tienes plantilla de fijos.{' '}
              <Link to="/mas/fijos" className="font-medium text-slate-700 underline">
                Créala aquí
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {activeFijos.length > 0 && gastosCount === 0 && tab === 'gastos' && (
        <p className="text-slate-500">No tienes gastos fijos este mes.</p>
      )}

      {tab === 'gastos' && gastosCount > 0 && sorted.length === 0 && (
        <p className="text-slate-500">Ningún fijo coincide con la búsqueda o los filtros.</p>
      )}

      {/* Tab Gastos: lista de fijos (los anidados consumen una bolsa y se ven en Presupuestos). */}
      {tab === 'gastos' && (
        <ul className="flex flex-col gap-2">{sorted.map((fixed) => renderRow(fixed))}</ul>
      )}

      {/* Tab Presupuestos: SOLO los presupuestos marcados "Mostrar en Fijos" (con su bolsa anidada) +
          el gasto hormiga (§5.9, §5.8). Su tope cuenta en los totales de arriba. Los presupuestos no
          marcados viven solo en la Plantilla. */}
      {tab === 'presupuestos' && (
        <ul className="flex flex-col gap-2">
          {checklistBudgetsShown.map((b) => {
            const consumed = consumedForCategory(b.categoryId);
            const items = linkedBudgetItems(b.categoryId, activeFijos).sort(compareFixed);
            return (
              <Fragment key={b.id}>
                <BudgetChecklistCard
                  categoryName={categoryName(b.categoryId) ?? 'Categoría'}
                  cap={budgetCapForMonth(b, month)}
                  consumed={consumed}
                  manuallyPaid={budgetManuallyPaid(b, month)}
                  onEditCap={() => setEditingBudgetCap(b)}
                  onMarkPaid={() => void handleBudgetMarkPaid(b)}
                  onUndoPaid={() => void handleBudgetUndoPaid(b)}
                />
                {items.map((it) => renderRow(it, { nested: true }))}
              </Fragment>
            );
          })}
          <HormigaBudgetCard month={month} />
        </ul>
      )}

      <PayFixedModal
        open={!!paying}
        fixed={paying}
        accounts={accounts.filter((a) => !a.archived)}
        cards={cards.filter((c) => !c.archived)}
        loans={loans.filter((l) => !l.archived)}
        onClose={() => setPaying(null)}
        onConfirm={handlePay}
      />

      <AllocateFixedModal
        open={!!allocating}
        fixed={allocating}
        accounts={accounts.filter((a) => !a.archived)}
        monthlyFixeds={fijos}
        onClose={() => setAllocating(null)}
        onConfirm={handleAllocate}
      />

      <FixedSyncModal
        open={syncOpen}
        diff={syncDiff}
        monthLabel={formatMonthLabel(month)}
        categories={categories}
        cards={cards}
        loans={loans}
        onApply={handleApplySync}
        onClose={() => setSyncOpen(false)}
      />

      <BudgetCapModal
        open={!!editingBudgetCap}
        categoryName={editingBudgetCap ? (categoryName(editingBudgetCap.categoryId) ?? 'Categoría') : ''}
        currentValue={editingBudgetCap ? budgetCapForMonth(editingBudgetCap, month) : 0}
        onConfirm={handleEditBudgetCap}
        onClose={() => setEditingBudgetCap(null)}
      />
    </div>
  );
}
