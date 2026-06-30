import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { MonthSelector } from '../../components/MonthSelector';
import { DisponibleRealBar } from '../../components/DisponibleRealBar';
import { SearchBar } from '../../components/SearchBar';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { BulkSelectBar } from '../../components/BulkSelectBar';
import { FixedFilters } from './FixedFilters';
import { FixedMutedBar } from './FixedMutedBar';
import { FixedTotalsBar } from './FixedTotalsBar';
import { FixedRow } from './FixedRow';
import { PayFixedModal } from './PayFixedModal';
import { AllocateFixedModal } from './AllocateFixedModal';
import { FixedSyncBanner } from './FixedSyncBanner';
import { FixedSyncModal } from './FixedSyncModal';
import { BudgetChecklistCard } from '../budgets/BudgetChecklistCard';
import { BudgetCapModal } from '../budgets/BudgetCapModal';
import { HormigaBudgetCard } from '../budgets/HormigaBudgetCard';
import { useFijos, type FixedTab, type FixedSort } from './useFijos';
import { EMPTY_FIXED_FILTER, isFixedFilterActive } from '../../../domain/fixedFilters';
import {
  budgetCapForMonth,
  budgetManuallyPaid,
  linkedBudgetItems,
} from '../../../domain/budgetBackedFixed';
import { addMonths, formatMonthLabel } from '../../../lib/date';
import type { FixedObligationMonthly } from '../../../domain/types';

// Pantalla de Fijos (CLAUDE.md §8.3): orquesta el hook `useFijos` (toda la lógica) y compone las
// secciones. Dos tabs: Gastos (se pagan/destinan) y Presupuestos de checklist (su tope cuenta, no se
// pagan con movimiento). Ambos alimentan los totales de arriba.
export function FijosScreen() {
  const f = useFijos();
  const renderRow = (fixed: FixedObligationMonthly, opts?: { nested?: boolean }) => (
    <FixedRow key={fixed.id} {...f.rowProps(fixed, opts)} />
  );

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 p-4 pb-24">
      <DisponibleRealBar />
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Fijos</h1>
        <div className="flex items-center gap-3">
          {/* Punto de entrada al modal cuando el banner está cerrado: icono con contador. */}
          {f.hasSyncChanges && f.dismissed && (
            <button
              type="button"
              onClick={() => f.setSyncOpen(true)}
              aria-label={`Actualizar fijos del mes (${f.syncCount} cambios)`}
              className="relative text-amber-600 hover:text-amber-700"
            >
              <RefreshCw className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                {f.syncCount}
              </span>
            </button>
          )}
          <Link to="/mas/fijos" className="text-sm text-slate-400 underline">
            Plantilla
          </Link>
        </div>
      </header>

      <MonthSelector
        month={f.month}
        onPrev={() => f.changeMonth(addMonths(f.month, -1))}
        onNext={() => f.changeMonth(addMonths(f.month, 1))}
      />
      <FixedTotalsBar totals={f.totals} />
      {/* Cálculo temporal de "apagar" gastos (§8.3): solo en Gastos y cuando hay ≥1 apagado. */}
      {f.tab === 'gastos' && f.apagados > 0 && (
        <FixedMutedBar pending={f.totals.pendingAmount - f.apagados} muted={f.apagados} />
      )}

      {f.hasSyncChanges && !f.dismissed && (
        <FixedSyncBanner
          count={f.syncCount}
          onOpen={() => f.setSyncOpen(true)}
          onDismiss={() => f.dismissSync(f.month)}
        />
      )}

      {/* Vaciar el mes: deja "Generar" como un mes nuevo (borra todos los fijos del mes). */}
      {f.fijos.length > 0 && (
        <button
          type="button"
          onClick={() => void f.handleClearMonth()}
          className="self-end text-xs text-slate-400 underline"
        >
          Vaciar mes
        </button>
      )}

      {(f.activeFijos.length > 0 || f.presupuestosCount > 0) && (
        <SegmentedTabs<FixedTab>
          value={f.tab}
          onChange={(next) => {
            f.setTab(next);
            // La selección masiva es por tab: al cambiar de lista, se limpia.
            f.clearSelection();
          }}
          tabs={[
            { value: 'gastos', label: 'Gastos', count: f.gastosCount },
            { value: 'presupuestos', label: 'Presupuestos', count: f.presupuestosCount },
          ]}
        />
      )}

      {(f.tab === 'gastos' ? f.gastosCount > 0 : f.presupuestosCount > 0) && (
        <SearchBar
          value={f.search}
          onChange={f.setSearch}
          placeholder={f.tab === 'presupuestos' ? 'Buscar presupuesto…' : 'Buscar gasto…'}
        />
      )}

      {/* Filtros (§8.3) y orden en una sola fila; el panel de filtros se despliega debajo. */}
      {f.tab === 'gastos' && f.gastosCount > 0 && (
        <>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => f.setFiltersExpanded((v) => !v)}
                className="text-slate-500 underline"
              >
                Filtros {f.filtersExpanded ? '▴' : '▾'}
              </button>
              {isFixedFilterActive(f.gastoFilter) && (
                <button
                  type="button"
                  onClick={() => f.setGastoFilter(EMPTY_FIXED_FILTER)}
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
                value={f.sort}
                onChange={(e) => f.setSort(e.target.value as FixedSort)}
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
            filter={f.gastoFilter}
            onChange={f.setGastoFilter}
            categoryOptions={f.gastoCategoryOptions}
            methodOptions={f.gastoMethodOptions}
            expanded={f.filtersExpanded}
          />
        </>
      )}

      {/* Acciones masivas solo en Gastos: los presupuestos de checklist no se pagan ni se destinan. */}
      {f.tab === 'gastos' && (
        <>
          {f.unpaid.length > 1 && f.selected.size === 0 && (
            <button
              type="button"
              onClick={f.handleMarkAllPaid}
              className="text-center text-sm text-slate-500 underline"
            >
              Marcar los {f.unpaid.length} como pagados (sin movimiento)
            </button>
          )}

          <BulkSelectBar
            selectedCount={f.selectedFijos.length}
            totalCount={f.sorted.length}
            allSelected={f.allVisibleSelected}
            onToggleAll={f.toggleAllVisible}
            actions={[
              { label: 'Marcar pagados', onClick: () => void f.handleBulkMarkPaid() },
              { label: 'Eliminar', danger: true, onClick: () => void f.handleBulkDelete() },
            ]}
          />
        </>
      )}

      {f.loading && <p className="text-slate-400">Cargando…</p>}

      {!f.loading && f.fijos.length === 0 && f.tab === 'gastos' && (
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
          {f.activeTemplates.length > 0 ? (
            <>
              <p className="text-slate-500">No has generado los fijos de este mes.</p>
              <button
                type="button"
                onClick={f.handleGenerate}
                disabled={f.generating}
                className="mt-3 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Generar {f.activeTemplates.length} fijos del mes
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

      {f.activeFijos.length > 0 && f.gastosCount === 0 && f.tab === 'gastos' && (
        <p className="text-slate-500">No tienes gastos fijos este mes.</p>
      )}

      {f.tab === 'gastos' && f.gastosCount > 0 && f.sorted.length === 0 && (
        <p className="text-slate-500">Ningún fijo coincide con la búsqueda o los filtros.</p>
      )}

      {/* Tab Gastos: lista de fijos (los anidados consumen una bolsa y se ven en Presupuestos). */}
      {f.tab === 'gastos' && (
        <ul className="flex flex-col gap-2">{f.sorted.map((fixed) => renderRow(fixed))}</ul>
      )}

      {/* Tab Presupuestos: SOLO los presupuestos marcados "Mostrar en Fijos" (con su bolsa anidada) +
          el gasto hormiga (§5.9, §5.8). Su tope cuenta en los totales de arriba. */}
      {f.tab === 'presupuestos' && (
        <ul className="flex flex-col gap-2">
          {f.checklistBudgetsShown.map((b) => {
            const consumed = f.consumedForCategory(b.categoryId);
            const items = linkedBudgetItems(b.categoryId, f.activeFijos).sort(f.compareFixed);
            return (
              <Fragment key={b.id}>
                <BudgetChecklistCard
                  categoryName={f.categoryName(b.categoryId) ?? 'Categoría'}
                  cap={budgetCapForMonth(b, f.month)}
                  consumed={consumed}
                  manuallyPaid={budgetManuallyPaid(b, f.month)}
                  onEditCap={() => f.setEditingBudgetCap(b)}
                  onMarkPaid={() => void f.handleBudgetMarkPaid(b)}
                  onUndoPaid={() => void f.handleBudgetUndoPaid(b)}
                />
                {items.map((it) => renderRow(it, { nested: true }))}
              </Fragment>
            );
          })}
          <HormigaBudgetCard month={f.month} />
        </ul>
      )}

      <PayFixedModal
        open={!!f.paying}
        fixed={f.paying}
        accounts={f.accounts}
        cards={f.cards}
        loans={f.loans}
        onClose={() => f.setPaying(null)}
        onConfirm={f.handlePay}
      />

      <AllocateFixedModal
        open={!!f.allocating}
        fixed={f.allocating}
        accounts={f.accounts}
        monthlyFixeds={f.fijos}
        onClose={() => f.setAllocating(null)}
        onConfirm={f.handleAllocate}
      />

      <FixedSyncModal
        open={f.syncOpen}
        diff={f.syncDiff}
        monthLabel={formatMonthLabel(f.month)}
        categories={f.categories}
        cards={f.allCards}
        loans={f.allLoans}
        onApply={f.handleApplySync}
        onClose={() => f.setSyncOpen(false)}
      />

      <BudgetCapModal
        open={!!f.editingBudgetCap}
        categoryName={
          f.editingBudgetCap ? (f.categoryName(f.editingBudgetCap.categoryId) ?? 'Categoría') : ''
        }
        currentValue={f.editingBudgetCap ? budgetCapForMonth(f.editingBudgetCap, f.month) : 0}
        onConfirm={f.handleEditBudgetCap}
        onClose={() => f.setEditingBudgetCap(null)}
      />
    </div>
  );
}
