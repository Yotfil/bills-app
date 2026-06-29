import type { FixedStatus } from './types';

/** Filtro de la pestaña Gastos de Fijos (§8.3). 'all' = no filtra esa dimensión. */
export interface FixedFilter {
  status: FixedStatus | 'all';
  categoryId: string | 'all';
  methodKey: string | 'all'; // 'kind:id' del medio de pago
  autoOnly: boolean; // solo los que tienen día de cobro automático
}
