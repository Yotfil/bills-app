import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useFixedMonthly } from '../../hooks/useFixedMonthly';
import { useSessionStore } from '../../../store/sessionStore';
import { useFixedSyncStore } from '../../../store/fixedSyncStore';
import { MonthSelector } from '../../components/MonthSelector';
import { DisponibleRealBar } from '../../components/DisponibleRealBar';
import { SearchBar } from '../../components/SearchBar';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { BulkSelectBar } from '../../components/BulkSelectBar';
import { matchesQuery } from '../../../lib/text';
import { FixedTotalsBar } from './FixedTotalsBar';
import { FixedRow } from './FixedRow';
import { PayFixedModal } from './PayFixedModal';
import { AllocateFixedModal } from './AllocateFixedModal';
import { FixedSyncBanner } from './FixedSyncBanner';
import { FixedSyncModal } from './FixedSyncModal';
import { EditCapModal } from './EditCapModal';
import { fixedTotals } from '../../../domain/fixed';
import { budgetStatus } from '../../../domain/reports';
import {
  budgetBackedAmount,
  budgetBackedFilled,
  effectiveFixedStatus,
  fixedCap,
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
import { alignBudgetToTemplate } from '../../../data/budgetFixedService';
import { subscribeFixedTemplates } from '../../../data/fixedTemplateRepository';
import {
  addFixedMonthlyFromTemplates,
  deleteFixedMonthly,
  generateFixedMonthly,
  markFixedAllocated,
  markFixedPaidWithoutTransaction,
  markFixedPending,
  payFixed,
  revertFixedPayment,
  setFixedCapOverride,
  setMonthlyBudgetBacked,
  updateMonthlyFromTemplate,
} from '../../../data/fixedMonthlyRepository';
import type { PayFixedInput } from '../../../data/PayFixedInput';
import type { FixedSyncSelection } from './FixedSyncModalProps';
import type {
  Account,
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
  const [paying, setPaying] = useState<FixedObligationMonthly | null>(null);
  const [allocating, setAllocating] = useState<FixedObligationMonthly | null>(null);
  const [editingCap, setEditingCap] = useState<FixedObligationMonthly | null>(null);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<FixedTab>('gastos');
  // Buscador independiente por tab (§8.3): cada lista conserva su propio texto.
  const [searchByTab, setSearchByTab] = useState<Record<FixedTab, string>>({
    gastos: '',
    presupuestos: '',
  });
  const search = searchByTab[tab];
  const setSearch = (value: string) => setSearchByTab((prev) => ({ ...prev, [tab]: value }));
  const [sort, setSort] = useState<FixedSort>('status');
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
  // Estado efectivo: un respaldado deriva pending/paid del consumo (su tope POR MES es su propio
  // monto, §5.9); el resto conserva su estado guardado.
  const effectiveStatusOf = (f: FixedObligationMonthly): FixedStatus =>
    effectiveFixedStatus(f, (cat) => budgetBackedFilled(consumedForCategory(cat), fixedCap(f)));
  // Monto que cada fijo aporta a los totales: un respaldado lleno/excedido aporta su gasto REAL
  // (Pagado incluye el sobrepaso, §5.9); en curso aporta su tope; el resto, su pagado/presupuestado.
  const amountOf = (f: FixedObligationMonthly): number =>
    f.budgetBacked
      ? budgetBackedAmount(f, consumedForCategory(f.categoryId))
      : (f.paidAmount ?? f.budgetedAmount);

  // Fijos que CONSUMEN de un presupuesto (§5.9 ext.): son ítems del checklist de una bolsa y se
  // muestran ANIDADOS bajo su presupuesto respaldado. Se excluyen de la lista normal y de los totales
  // (la bolsa ya los representa). Un ítem "huérfano" (su categoría no tiene presupuesto respaldado este
  // mes) NO se anida: cae en el tab Gastos como un fijo normal para que no desaparezca.
  const envelopeCategoryIds = new Set(fijos.filter((f) => f.budgetBacked).map((f) => f.categoryId));
  const isNested = (f: FixedObligationMonthly) =>
    isBudgetItem(f) && !f.budgetBacked && envelopeCategoryIds.has(f.categoryId);

  // El tab separa gastos fijos (no respaldados) de presupuestos fijos (respaldados, §5.9). Los ítems
  // anidados no aparecen sueltos en ningún tab: cuelgan de su presupuesto en el tab Presupuestos.
  const inActiveTab = (f: FixedObligationMonthly) =>
    tab === 'presupuestos' ? f.budgetBacked : !f.budgetBacked && !isNested(f);
  const gastosCount = fijos.filter((f) => !f.budgetBacked && !isNested(f)).length;
  const presupuestosCount = fijos.filter((f) => f.budgetBacked).length;
  // Ítems del tab activo (antes del buscador): sirve para los estados vacíos por tab.
  const tabItems = fijos.filter(inActiveTab);

  // Etiqueta para agrupar/ordenar por categoría: los abonos a deuda no tienen categoría, así que
  // se agrupan bajo "Abono a deuda" (consistente con su subtítulo en la fila).
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name;
  const groupLabel = (f: FixedObligationMonthly) =>
    f.payKind === 'debt_payment' ? 'Abono a deuda' : (categoryName(f.categoryId) ?? 'Sin categoría');

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

  const sorted = tabItems.filter((f) => matchesQuery(search, f.name)).sort(compareFixed);
  // Los totales suman todos los fijos (gastos y presupuestos), MENOS los ítems anidados que consumen
  // una bolsa: ya están representados por el tope del presupuesto, contarlos aparte duplicaría (§5.9 ext.).
  const totals = fixedTotals(
    fijos.filter((f) => !isNested(f)),
    effectiveStatusOf,
    amountOf,
  );
  const activeTemplates = templates.filter((t) => t.active && !t.archived);
  // Los respaldados no se pagan/destinan, y los ítems anidados se pagan desde su bolsa: ambos se
  // excluyen de las acciones masivas de pago.
  const unpaid = fijos.filter((f) => !f.budgetBacked && !isNested(f) && f.status !== 'paid');

  // Diferencias entre la plantilla y los fijos ya generados de ESTE mes (§5.10). Solo tiene
  // sentido cuando el mes ya está generado: si está vacío, se ofrece "Generar", no sincronizar.
  const syncDiff = computeFixedSyncDiff(templates, fijos);
  const hasSyncChanges = fijos.length > 0 && hasFixedSyncChanges(syncDiff);
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

  async function handleGenerate() {
    if (!uid) return;
    setGenerating(true);
    try {
      await generateFixedMonthly(uid, month);
      // Alinea el tope del presupuesto al monto de plantilla para los respaldados (B = T, §5.9).
      await Promise.all(activeTemplates.map((t) => alignBudgetToTemplate(uid, t)));
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

  // Editar el tope de un fijo respaldado desde Fijos (§5.9): es un override de SOLO este mes
  // (`capOverride`). No toca la base (plantilla/presupuesto) ni los demás meses; el próximo mes vuelve
  // a la base. La base recurrente se cambia desde Presupuestos.
  async function handleEditCap(amount: number) {
    if (!uid || !editingCap) return;
    await setFixedCapOverride(uid, editingCap.id, amount);
  }

  // Aplica solo lo que el usuario marcó en el modal de sincronización (§5.10): agrega plantillas
  // nuevas, reescribe snapshots desfasados y quita instancias cuya plantilla ya no aplica.
  async function handleApplySync(sel: FixedSyncSelection) {
    if (!uid) return;
    const addTemplates = syncDiff.toAdd.filter((t) => sel.add.has(t.id));
    await Promise.all([
      ...(addTemplates.length ? [addFixedMonthlyFromTemplates(uid, month, addTemplates)] : []),
      // Alinear el presupuesto al monto de plantilla para los respaldados recién agregados (§5.9).
      ...addTemplates.map((t) => alignBudgetToTemplate(uid, t)),
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
      budgetConsumed={fixed.budgetBacked ? consumedForCategory(fixed.categoryId) : undefined}
      onEditCap={fixed.budgetBacked ? () => setEditingCap(fixed) : undefined}
      selected={opts?.nested ? undefined : selected.has(fixed.id)}
      onToggleSelect={opts?.nested ? undefined : () => toggleOne(fixed.id)}
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
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
      />
      <FixedTotalsBar totals={totals} />

      {hasSyncChanges && !dismissed && (
        <FixedSyncBanner
          count={syncCount}
          onOpen={() => setSyncOpen(true)}
          onDismiss={() => dismissSync(month)}
        />
      )}

      {fijos.length > 0 && (
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

      {tabItems.length > 0 && (
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={tab === 'presupuestos' ? 'Buscar presupuesto…' : 'Buscar gasto…'}
        />
      )}

      {tabItems.length > 0 && (
        <div className="flex items-center justify-end gap-2">
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

      {/* En Presupuestos solo "Eliminar" (no se pagan/destinan): borra las bolsas seleccionadas y sus
          ítems ligados. Útil para limpiar un mes generado por error (§5.9 ext.). */}
      {tab === 'presupuestos' && (
        <BulkSelectBar
          selectedCount={selectedFijos.length}
          totalCount={sorted.length}
          allSelected={allVisibleSelected}
          onToggleAll={toggleAllVisible}
          actions={[{ label: 'Eliminar', danger: true, onClick: () => void handleBulkDelete() }]}
        />
      )}

      {loading && <p className="text-slate-400">Cargando…</p>}

      {!loading && fijos.length === 0 && (
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

      {fijos.length > 0 && tabItems.length === 0 && (
        <p className="text-slate-500">
          {tab === 'presupuestos'
            ? 'No tienes presupuestos fijos este mes.'
            : 'No tienes gastos fijos este mes.'}
        </p>
      )}

      {tabItems.length > 0 && sorted.length === 0 && (
        <p className="text-slate-500">Ningún fijo coincide con “{search}”.</p>
      )}

      <ul className="flex flex-col gap-2">
        {sorted.flatMap((fixed) => {
          // Un presupuesto respaldado arrastra debajo su checklist: los fijos que lo CONSUMEN
          // (§5.9 ext.), anidados, con pendiente/pagado. Pagar uno descuenta esa bolsa.
          if (!fixed.budgetBacked) return [renderRow(fixed)];
          const items = linkedBudgetItems(fixed.categoryId, fijos).sort(compareFixed);
          return [renderRow(fixed), ...items.map((it) => renderRow(it, { nested: true }))];
        })}
      </ul>

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

      <EditCapModal
        open={!!editingCap}
        fixed={editingCap}
        onConfirm={handleEditCap}
        onClose={() => setEditingCap(null)}
      />
    </div>
  );
}
