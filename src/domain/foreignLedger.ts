// Ledger EN DIVISA de las cuentas en moneda extranjera (decisión 2026-07-09). Una cuenta en
// divisa es MONOMONEDA: todos sus movimientos llevan el monto original en su moneda
// (Transaction.foreignCurrency/foreignAmount) y ese monto mueve `Account.foreignAmount` (la
// fuente de verdad), igual que el `amount` COP mueve `cachedBalance` (ledger interno).
//
// El LADO al que aplica se deriva del tipo (no hace falta un campo extra):
//   income       → +foreignAmount a la cuenta destino
//   expense      → −foreignAmount a la cuenta origen
//   transfer     → −origen y +destino (solo entre cuentas de la MISMA moneda; los cruces de
//                  moneda están fuera de alcance: el cambio USD→COP es manual por ahora)
//   adjustment   → ±foreignAmount a la cuenta origen según adjustmentDirection (reconciliación)
//   debt_payment → nunca (las deudas son COP; se paga solo desde cuentas COP)
import { formatCopPlain } from '../lib/currency';
import type { TransactionDraft } from './types';

type ForeignTxn = Pick<
  TransactionDraft,
  'type' | 'source' | 'destination' | 'foreignAmount' | 'adjustmentDirection'
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
  if (!txn.foreignAmount) return [];
  const entries: ForeignDeltaEntry[] = [];
  switch (txn.type) {
    case 'income':
      if (txn.destination?.kind === 'account') {
        entries.push({ accountId: txn.destination.id, amount: txn.foreignAmount });
      }
      break;
    case 'expense':
      if (txn.source?.kind === 'account') {
        entries.push({ accountId: txn.source.id, amount: -txn.foreignAmount });
      }
      break;
    case 'transfer':
      if (txn.source?.kind === 'account') {
        entries.push({ accountId: txn.source.id, amount: -txn.foreignAmount });
      }
      if (txn.destination?.kind === 'account') {
        entries.push({ accountId: txn.destination.id, amount: txn.foreignAmount });
      }
      break;
    case 'adjustment':
      if (txn.source?.kind === 'account') {
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
