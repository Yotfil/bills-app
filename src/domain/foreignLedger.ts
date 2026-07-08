// Ledger EN DIVISA de las cuentas en moneda extranjera (decisión 2026-07-09). Una cuenta en
// divisa es MONOMONEDA: todos sus movimientos llevan el monto original en su moneda
// (Transaction.foreignCurrency/foreignAmount) y ese monto mueve `Account.foreignAmount` (la
// fuente de verdad), igual que el `amount` COP mueve `cachedBalance` (ledger interno).
//
// El LADO al que aplica se deriva del tipo (no hace falta un campo extra):
//   income       → +foreignAmount a la cuenta destino
//   expense      → −foreignAmount a la cuenta origen
//   transfer     → −origen (foreignAmount) y +destino. Misma moneda: el destino reusa foreignAmount.
//                  Cross-moneda (destinationAmount presente): el destino usa su propia divisa
//                  (destinationForeignAmount), independiente de la del origen.
//   adjustment   → ±foreignAmount a la cuenta origen según adjustmentDirection (reconciliación)
//   debt_payment → nunca (las deudas son COP; se paga solo desde cuentas COP)
import { formatCopPlain } from '../lib/currency';
import type { TransactionDraft } from './types';

type ForeignTxn = Pick<
  TransactionDraft,
  | 'type'
  | 'source'
  | 'destination'
  | 'foreignAmount'
  | 'adjustmentDirection'
  | 'destinationAmount'
  | 'destinationForeignAmount'
>;

export interface ForeignDeltaEntry {
  accountId: string;
  amount: number; // en la divisa del movimiento; el signo ya indica el efecto
}

/**
 * Deltas que un movimiento aplica al monto en divisa (`foreignAmount`) de las cuentas.
 * Devuelve [] si el movimiento no es en divisa. En income es idéntico al viejo
 * `foreignIncomeDelta` (compat: los ingresos existentes se revierten igual al editar/borrar).
 */
export function foreignDelta(txn: ForeignTxn): ForeignDeltaEntry[] {
  // Un movimiento es "en divisa" si la pata de origen (foreignAmount) o la de destino de una
  // transferencia cross-moneda (destinationForeignAmount) lleva monto en divisa.
  if (!txn.foreignAmount && !txn.destinationForeignAmount) return [];
  const entries: ForeignDeltaEntry[] = [];
  switch (txn.type) {
    case 'income':
      if (txn.destination?.kind === 'account' && txn.foreignAmount) {
        entries.push({ accountId: txn.destination.id, amount: txn.foreignAmount });
      }
      break;
    case 'expense':
      if (txn.source?.kind === 'account' && txn.foreignAmount) {
        entries.push({ accountId: txn.source.id, amount: -txn.foreignAmount });
      }
      break;
    case 'transfer': {
      // Origen: baja su divisa (si la cuenta es en divisa).
      if (txn.source?.kind === 'account' && txn.foreignAmount) {
        entries.push({ accountId: txn.source.id, amount: -txn.foreignAmount });
      }
      // Destino: en cross-moneda su divisa es independiente (destinationForeignAmount); en misma
      // moneda (legacy) comparte la divisa del origen, así que reusa foreignAmount.
      const isCross = txn.destinationAmount != null;
      const destForeign = isCross ? (txn.destinationForeignAmount ?? null) : (txn.foreignAmount ?? null);
      if (txn.destination?.kind === 'account' && destForeign) {
        entries.push({ accountId: txn.destination.id, amount: destForeign });
      }
      break;
    }
    case 'adjustment':
      if (txn.source?.kind === 'account' && txn.foreignAmount) {
        const signed =
          txn.adjustmentDirection === 'decrease' ? -txn.foreignAmount : txn.foreignAmount;
        entries.push({ accountId: txn.source.id, amount: signed });
      }
      break;
    case 'debt_payment':
      break; // prohibido por validación (§11): las deudas son COP
  }
  return entries;
}

/** Nota por defecto al reconciliar en divisa, p.ej. "Reconciliación en USD (tasa 3.950)". */
export function buildForeignReconcileNote(currency: string, rateToCop: number): string {
  return `Reconciliación en ${currency} (tasa ${formatCopPlain(rateToCop)})`;
}
