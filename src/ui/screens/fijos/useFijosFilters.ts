import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  EMPTY_FIXED_FILTER,
  matchesFixedFilter,
  type FixedFilter,
} from '../../../domain/fixedFilters';
import { matchesQuery } from '../../../lib/text';
import { mutedPendingTotal } from '../../../domain/fixed';
import type { useFijosData } from './useFijosData';
import type { FixedObligationMonthly, FixedStatus } from '../../../domain/types';

// Orden de lectura: lo que falta primero, lo pagado al final.
const STATUS_ORDER: Record<FixedStatus, number> = { pending: 0, allocated: 1, paid: 2 };

export type FixedTab = 'gastos' | 'presupuestos';

// Criterios de orden de la lista. "status" (por defecto) deja lo pendiente primero y lo pagado al
// final (la esencia del checklist). "category" agrupa por categoría y dentro ordena por nombre.
export type FixedSort = 'status' | 'name-asc' | 'name-desc' | 'category';

// Lo que este hook necesita de useFijosData (Pick para no re-declarar tipos, DRY).
type FijosDataForFilters = Pick<
  ReturnType<typeof useFijosData>,
  'gastosItems' | 'inChecklistBudgets' | 'categoryName' | 'groupLabel' | 'methodLabel'
>;

/**
 * Capa de ESTADO DE LISTA de la pantalla de Fijos (§8.3): tab, búsqueda por tab, orden, filtros,
 * selección masiva y el "apagar" temporal. Recibe los datos ya derivados de `useFijosData` y
 * devuelve las listas visibles (`sorted`, `checklistBudgetsShown`). Sin efectos ni escrituras.
 */
export function useFijosFilters(data: FijosDataForFilters) {
  const { gastosItems, inChecklistBudgets, categoryName, groupLabel, methodLabel } = data;

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
  const resetMuted = () => setMutedIds(new Set());
  // "Apagados": aporte a Por destinar de los gastos apagados (§8.3). Cálculo temporal.
  const apagados = mutedPendingTotal(gastosItems, (id) => mutedIds.has(id));

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
  const gastoMethodOptions = Array.from(
    new Map(
      gastosItems.map((f) => [
        `${f.paymentMethod.kind}:${f.paymentMethod.id}`,
        methodLabel(f.paymentMethod),
      ]),
    ),
    ([value, label]) => ({ value, label }),
  );

  // Selección para acciones masivas (§8.3): eliminar y marcar pagados sin movimiento.
  const [selected, setSelected] = useState<Set<string>>(new Set());
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

  return {
    tab,
    setTab,
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
    compareFixed,
    sorted,
    checklistBudgetsShown,
    mutedIds,
    toggleMute,
    resetMuted,
    apagados,
    selected,
    selectedFijos,
    allVisibleSelected,
    toggleOne,
    toggleAllVisible,
    clearSelection,
  };
}
