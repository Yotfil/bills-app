import type { useFijos } from './useFijos';

type Hook = ReturnType<typeof useFijos>;

// El contrato del tab Gastos = el subconjunto del hook que necesita (DRY: no re-tipa los campos).
export type FixedExpensesTabProps = Pick<
  Hook,
  | 'gastoFilter'
  | 'setGastoFilter'
  | 'filtersExpanded'
  | 'setFiltersExpanded'
  | 'sort'
  | 'setSort'
  | 'gastoCategoryOptions'
  | 'gastoMethodOptions'
  | 'gastosCount'
  | 'unpaid'
  | 'selected'
  | 'handleMarkAllPaid'
  | 'selectedFijos'
  | 'sorted'
  | 'allVisibleSelected'
  | 'toggleAllVisible'
  | 'handleBulkMarkPaid'
  | 'handleBulkDelete'
  | 'fijos'
  | 'activeFijos'
  | 'activeTemplates'
  | 'handleGenerate'
  | 'generating'
  | 'rowProps'
>;
