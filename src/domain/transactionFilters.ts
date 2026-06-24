import { matchesQuery } from '../lib/text';
import type { EntityRef, Transaction } from './types';
import type { TransactionFilter } from './TransactionFilter';

// Reexportado para que los consumidores importen interfaz y funciones desde un solo módulo.
export type { TransactionFilter } from './TransactionFilter';

/** Filtro neutro: no oculta nada. Punto de partida de la UI. */
export const EMPTY_TRANSACTION_FILTER: TransactionFilter = {
  text: '',
  type: 'all',
  categoryId: null,
  entityKey: null,
  fromMillis: null,
  toMillis: null,
};

/** `true` si el filtro oculta algo (para mostrar "Limpiar" y un contador de filtros). */
export function isFilterActive(filter: TransactionFilter): boolean {
  return (
    filter.text.trim() !== '' ||
    filter.type !== 'all' ||
    filter.categoryId !== null ||
    filter.entityKey !== null ||
    filter.fromMillis !== null ||
    filter.toMillis !== null
  );
}

const refKey = (ref: EntityRef | null): string | null => (ref ? `${ref.kind}:${ref.id}` : null);

/** El movimiento toca la entidad `key` ('kind:id') si es su origen o su destino. */
function touchesEntity(txn: Transaction, key: string): boolean {
  return refKey(txn.source) === key || refKey(txn.destination) === key;
}

/**
 * Filtra el libro de movimientos según los criterios del Registro (§8.2). Función pura y
 * testeable: no toca React ni Firestore. Conserva el orden de entrada (cronológico inverso).
 * Cada criterio nulo/'all'/vacío no filtra; el resultado cumple TODOS los activos (AND).
 */
export function filterTransactions(
  transactions: Transaction[],
  filter: TransactionFilter,
): Transaction[] {
  return transactions.filter((txn) => {
    if (filter.type !== 'all' && txn.type !== filter.type) return false;
    if (filter.categoryId !== null && txn.categoryId !== filter.categoryId) return false;
    if (filter.entityKey !== null && !touchesEntity(txn, filter.entityKey)) return false;

    const millis = txn.date.toMillis();
    if (filter.fromMillis !== null && millis < filter.fromMillis) return false;
    if (filter.toMillis !== null && millis > filter.toMillis) return false;

    // El texto se busca en lo que el usuario reconoce: concepto, nota y etiquetas.
    return matchesQuery(filter.text, txn.concept, txn.note, txn.tags.join(' '));
  });
}
