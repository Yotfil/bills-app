// Filtros de la pestaña Gastos de Fijos (§8.3): por estado, categoría, medio de pago y "solo con cobro
// automático". Lógica PURA y testeable, separada de la UI (igual que `transactionFilters`).
import type { FixedFilter } from './FixedFilter';
import type { EntityRef, FixedObligationMonthly } from './types';

export type { FixedFilter } from './FixedFilter';

/** Filtro neutro: no oculta nada. */
export const EMPTY_FIXED_FILTER: FixedFilter = {
  status: 'all',
  categoryId: 'all',
  methodKey: 'all',
  autoOnly: false,
};

const refKey = (ref: EntityRef | null | undefined): string | null =>
  ref ? `${ref.kind}:${ref.id}` : null;

/** `true` si el filtro oculta algo (para mostrar "Limpiar" y un contador). */
export function isFixedFilterActive(filter: FixedFilter): boolean {
  return (
    filter.status !== 'all' ||
    filter.categoryId !== 'all' ||
    filter.methodKey !== 'all' ||
    filter.autoOnly
  );
}

/** `true` si el fijo pasa todas las dimensiones del filtro. */
export function matchesFixedFilter(fixed: FixedObligationMonthly, filter: FixedFilter): boolean {
  if (filter.status !== 'all' && fixed.status !== filter.status) return false;
  if (filter.categoryId !== 'all' && fixed.categoryId !== filter.categoryId) return false;
  if (filter.methodKey !== 'all' && refKey(fixed.paymentMethod) !== filter.methodKey) return false;
  if (filter.autoOnly && fixed.autoPayDay == null) return false;
  return true;
}
