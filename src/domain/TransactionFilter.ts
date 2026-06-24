import type { TransactionType } from './types';

/**
 * Criterios de filtrado del Registro (CLAUDE.md §8.2): texto, tipo, categoría, cuenta/medio
 * y rango de fechas. Es un tipo de DOMINIO (puro): las fechas viajan como milisegundos
 * (`number`), no como `Timestamp`, para que `filterTransactions` no dependa de Firestore.
 * La UI convierte los `<input type="date">` a estas cotas.
 */
export interface TransactionFilter {
  /** Texto libre; se busca en concepto, nota y etiquetas (sin tildes ni mayúsculas). */
  text: string;
  /** Tipo de movimiento, o `'all'` para no filtrar por tipo. */
  type: TransactionType | 'all';
  /** ID de categoría exacta, o `null` para todas. */
  categoryId: string | null;
  /** Cuenta/tarjeta/crédito como `'kind:id'` (origen o destino), o `null` para todas. */
  entityKey: string | null;
  /** Cota inferior inclusiva (ms desde epoch), o `null` si no hay "desde". */
  fromMillis: number | null;
  /** Cota superior inclusiva (ms desde epoch), o `null` si no hay "hasta". */
  toMillis: number | null;
}
