import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { MonthSelector } from '../../components/MonthSelector';
import { DisponibleRealBar } from '../../components/DisponibleRealBar';
import { SearchBar } from '../../components/SearchBar';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { FixedMutedBar } from './FixedMutedBar';
import { FixedTotalsBar } from './FixedTotalsBar';
import { FixedExpensesTab } from './FixedExpensesTab';
import { FixedBudgetsTab } from './FixedBudgetsTab';
import { PayFixedModal } from './PayFixedModal';
import { AllocateFixedModal } from './AllocateFixedModal';
import { FixedSyncBanner } from './FixedSyncBanner';
import { FixedSyncModal } from './FixedSyncModal';
import { BudgetCapModal } from '../budgets/BudgetCapModal';
import { useFijos, type FixedTab } from './useFijos';
import { budgetCapForMonth } from '../../../domain/budgetBackedFixed';
import { addMonths, formatMonthLabel } from '../../../lib/date';

// Pantalla de Fijos (CLAUDE.md §8.3): orquesta el hook `useFijos` (toda la lógica) y compone las
// secciones. Dos tabs: Gastos (se pagan/destinan) y Presupuestos de checklist (su tope cuenta, no se
// pagan con movimiento). Ambos alimentan los totales de arriba.
export function FijosScreen() {
  const f = useFijos();

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

      {f.loading && <p className="text-slate-400">Cargando…</p>}

      {/* Tab Gastos: toolbar de filtros/orden, acciones masivas, estados vacíos y la lista. */}
      {f.tab === 'gastos' && !f.loading && (
        <FixedExpensesTab
          gastoFilter={f.gastoFilter}
          setGastoFilter={f.setGastoFilter}
          filtersExpanded={f.filtersExpanded}
          setFiltersExpanded={f.setFiltersExpanded}
          sort={f.sort}
          setSort={f.setSort}
          gastoCategoryOptions={f.gastoCategoryOptions}
          gastoMethodOptions={f.gastoMethodOptions}
          gastosCount={f.gastosCount}
          unpaid={f.unpaid}
          selected={f.selected}
          handleMarkAllPaid={f.handleMarkAllPaid}
          selectedFijos={f.selectedFijos}
          sorted={f.sorted}
          allVisibleSelected={f.allVisibleSelected}
          toggleAllVisible={f.toggleAllVisible}
          handleBulkMarkPaid={f.handleBulkMarkPaid}
          handleBulkDelete={f.handleBulkDelete}
          fijos={f.fijos}
          activeFijos={f.activeFijos}
          activeTemplates={f.activeTemplates}
          handleGenerate={f.handleGenerate}
          generating={f.generating}
          rowProps={f.rowProps}
        />
      )}

      {f.tab === 'presupuestos' && (
        <FixedBudgetsTab
          budgets={f.checklistBudgetsShown}
          month={f.month}
          activeFijos={f.activeFijos}
          consumedForCategory={f.consumedForCategory}
          compareFixed={f.compareFixed}
          categoryName={f.categoryName}
          onEditCap={f.setEditingBudgetCap}
          onBudgetMarkPaid={(b) => void f.handleBudgetMarkPaid(b)}
          onBudgetUndoPaid={(b) => void f.handleBudgetUndoPaid(b)}
          rowProps={f.rowProps}
        />
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
