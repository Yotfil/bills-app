import { Link } from 'react-router-dom';
import { BulkSelectBar } from '../../components/BulkSelectBar';
import { FixedFilters } from './FixedFilters';
import { FixedRow } from './FixedRow';
import { EMPTY_FIXED_FILTER, isFixedFilterActive } from '../../../domain/fixedFilters';
import type { FixedSort } from './useFijos';
import type { FixedExpensesTabProps } from './FixedExpensesTabProps';

// Pestaña Gastos de Fijos (§8.3): barra de filtros/orden, acciones masivas, estados vacíos y la lista
// de fijos. El buscador y el indicador de carga viven en FijosScreen (compartidos con Presupuestos).
export function FixedExpensesTab({
  gastoFilter,
  setGastoFilter,
  filtersExpanded,
  setFiltersExpanded,
  sort,
  setSort,
  gastoCategoryOptions,
  gastoMethodOptions,
  gastosCount,
  unpaid,
  selected,
  handleMarkAllPaid,
  selectedFijos,
  sorted,
  allVisibleSelected,
  toggleAllVisible,
  handleBulkMarkPaid,
  handleBulkDelete,
  fijos,
  activeFijos,
  activeTemplates,
  handleGenerate,
  generating,
  rowProps,
}: FixedExpensesTabProps) {
  return (
    <>
      {/* Filtros (§8.3) y orden en una sola fila; el panel de filtros se despliega debajo. */}
      {gastosCount > 0 && (
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

      {/* Acciones masivas: marcar todos como pagados (sin movimiento) y la barra de selección. */}
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

      {/* Mes sin generar (o sin plantilla aún). */}
      {fijos.length === 0 && (
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

      {activeFijos.length > 0 && gastosCount === 0 && (
        <p className="text-slate-500">No tienes gastos fijos este mes.</p>
      )}

      {gastosCount > 0 && sorted.length === 0 && (
        <p className="text-slate-500">Ningún fijo coincide con la búsqueda o los filtros.</p>
      )}

      <ul className="flex flex-col gap-2">
        {sorted.map((fixed) => (
          <FixedRow key={fixed.id} {...rowProps(fixed)} />
        ))}
      </ul>
    </>
  );
}
