// Ledger EN DIVISA de las tarjetas de crédito (tarjeta multimoneda, 2026-07-07). Una tarjeta puede
// cobrar en COP y en compras internacionales en cualquier divisa (USD, EUR…): mantiene un pool de
// deuda por moneda en `CreditCard.foreignDebts` (mapa moneda→monto, la fuente de verdad de cada
// pool). Este módulo calcula, de forma pura, cuánto mueve un movimiento el pool de SU moneda.
//
// El lado/signo se deriva del tipo (solo con `source.kind === 'card'` y monto en divisa):
//   expense    → +foreignAmount (la deuda en esa moneda SUBE al comprar)
//   adjustment → ±foreignAmount según adjustmentDirection (reconciliar la deuda en esa moneda, §5.7)
//   resto      → [] (el abono a deuda en divisa está fuera de alcance: se paga en COP a la TRM del día)
import type { TransactionDraft } from './types';

type ForeignCardTxn = Pick<
  TransactionDraft,
  'type' | 'source' | 'foreignCurrency' | 'foreignAmount' | 'adjustmentDirection'
>;

export interface ForeignCardDeltaEntry {
  cardId: string;
  currency: string; // moneda del pool afectado (clave en foreignDebts)
  amount: number; // en esa divisa; el signo ya indica el efecto sobre la deuda
}

/**
 * Deltas que un movimiento aplica a los pools de deuda en divisa (`foreignDebts`) de una tarjeta.
 * Devuelve [] si el movimiento no es en divisa, no lleva moneda o no sale de una tarjeta.
 */
export function foreignCardDelta(txn: ForeignCardTxn): ForeignCardDeltaEntry[] {
  if (!txn.foreignAmount || !txn.foreignCurrency) return [];
  if (txn.source?.kind !== 'card') return [];
  const currency = txn.foreignCurrency;
  switch (txn.type) {
    case 'expense':
      return [{ cardId: txn.source.id, currency, amount: txn.foreignAmount }];
    case 'adjustment':
      return [
        {
          cardId: txn.source.id,
          currency,
          amount: txn.adjustmentDirection === 'decrease' ? -txn.foreignAmount : txn.foreignAmount,
        },
      ];
    default:
      return [];
  }
}
