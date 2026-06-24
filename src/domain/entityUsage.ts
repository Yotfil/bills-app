import type { LedgerEntityKind, Transaction } from './types';

// Regla CRUD del §8.4: "eliminar = archivar si el elemento tiene movimientos asociados". Una
// cuenta/tarjeta/crédito referenciada por algún movimiento (como origen o destino) NO se puede
// borrar físicamente sin romper el histórico; solo archivar. Esta función pura decide eso.

/** `true` si algún movimiento usa la entidad `kind:id` como origen o destino. */
export function entityHasMovements(
  transactions: Transaction[],
  kind: LedgerEntityKind,
  id: string,
): boolean {
  return transactions.some(
    (t) =>
      (t.source?.kind === kind && t.source.id === id) ||
      (t.destination?.kind === kind && t.destination.id === id),
  );
}
