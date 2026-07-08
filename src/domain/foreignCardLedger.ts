// Ledger EN DIVISA de las tarjetas de crédito (gastos en divisa, 2026-07-07). Una tarjeta puede
// cobrar en COP o en una divisa (ej. USD) según si la compra es internacional: es MIXTA, con dos
// pools de deuda. La parte en divisa vive en `CreditCard.cachedForeignDebt` (la fuente de verdad de
// ese pool), igual que `Account.foreignAmount` para las cuentas. Este módulo calcula, de forma pura,
// cuánto mueve un movimiento ese pool.
//
// El signo/lado se deriva del tipo (solo con `source.kind === 'card'` y monto en divisa):
//   expense    → +foreignAmount (la deuda en divisa SUBE al comprar)
//   adjustment → ±foreignAmount según adjustmentDirection (reconciliar la deuda en divisa, §5.7)
//   resto      → [] (el abono a deuda en divisa está fuera de alcance por ahora: se paga en COP)
import type { TransactionDraft } from './types';

type ForeignCardTxn = Pick<
  TransactionDraft,
  'type' | 'source' | 'foreignAmount' | 'adjustmentDirection'
>;

export interface ForeignCardDeltaEntry {
  cardId: string;
  amount: number; // en la divisa del movimiento; el signo ya indica el efecto sobre la deuda
}

/**
 * Deltas que un movimiento aplica a la deuda en divisa (`cachedForeignDebt`) de una tarjeta.
 * Devuelve [] si el movimiento no es en divisa o no sale de una tarjeta.
 */
export function foreignCardDelta(txn: ForeignCardTxn): ForeignCardDeltaEntry[] {
  if (!txn.foreignAmount) return [];
  if (txn.source?.kind !== 'card') return [];
  switch (txn.type) {
    case 'expense':
      return [{ cardId: txn.source.id, amount: txn.foreignAmount }];
    case 'adjustment':
      return [
        {
          cardId: txn.source.id,
          amount: txn.adjustmentDirection === 'decrease' ? -txn.foreignAmount : txn.foreignAmount,
        },
      ];
    default:
      return [];
  }
}
