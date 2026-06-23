// Efectos de cada transacción sobre los saldos (CLAUDE.md §4, §5.4-§5.6).
//
// PRINCIPIO (§2, §9.3): la fuente de verdad son los movimientos; los `cachedBalance` /
// `cachedDebt` son una caché derivada. Aquí se calcula, de forma pura, cuánto cambia cada
// entidad por una transacción. La capa de datos aplica estos deltas atómicamente.
//
// Convención de signos de los CACHÉS:
//   - cuenta.cachedBalance: sube con ingresos, baja con gastos/salidas.
//   - tarjeta.cachedDebt: sube al gastar con la tarjeta, baja al abonar (deuda, no saldo).
//   - crédito.cachedBalance: el saldo que falta por pagar; baja al abonar.
import type { TransactionDraft } from './types';

/** Cambios a aplicar a las cachés, por id de entidad. Positivo = sube esa caché. */
export interface LedgerDelta {
  accounts: Record<string, number>; // delta a cuenta.cachedBalance
  cards: Record<string, number>; // delta a tarjeta.cachedDebt
  loans: Record<string, number>; // delta a crédito.cachedBalance
}

function emptyDelta(): LedgerDelta {
  return { accounts: {}, cards: {}, loans: {} };
}

function add(map: Record<string, number>, id: string, amount: number): void {
  map[id] = (map[id] ?? 0) + amount;
}

/**
 * Calcula el efecto de UNA transacción sobre los saldos. No lee ni escribe nada: solo
 * traduce el tipo de movimiento a deltas (la "tabla de efectos" de §5.4 hecha código).
 */
export function transactionDelta(txn: TransactionDraft): LedgerDelta {
  const delta = emptyDelta();
  const { source, destination, amount } = txn;

  switch (txn.type) {
    case 'expense':
      // Gasto: baja la cuenta, o sube la deuda de la tarjeta (no toca cuentas).
      if (source?.kind === 'account') add(delta.accounts, source.id, -amount);
      else if (source?.kind === 'card') add(delta.cards, source.id, +amount);
      break;

    case 'income':
      // Ingreso: sube la cuenta destino.
      if (destination?.kind === 'account') add(delta.accounts, destination.id, +amount);
      break;

    case 'transfer':
      // Transferencia: baja origen y sube destino por el mismo monto (neto cero).
      if (source?.kind === 'account') add(delta.accounts, source.id, -amount);
      if (destination?.kind === 'account') add(delta.accounts, destination.id, +amount);
      break;

    case 'debt_payment':
      // Abono: baja la cuenta origen y baja la deuda/saldo de la tarjeta o crédito.
      if (source?.kind === 'account') add(delta.accounts, source.id, -amount);
      if (destination?.kind === 'card') add(delta.cards, destination.id, -amount);
      else if (destination?.kind === 'loan') add(delta.loans, destination.id, -amount);
      break;

    case 'adjustment':
      // Reconciliación: ajusta el saldo de la cuenta según la dirección (§5.7).
      if (source?.kind === 'account') {
        const signed = txn.adjustmentDirection === 'decrease' ? -amount : +amount;
        add(delta.accounts, source.id, signed);
      }
      break;
  }

  return delta;
}

/** Delta inverso (para revertir una transacción al editarla o eliminarla, §9.3). */
export function invertDelta(delta: LedgerDelta): LedgerDelta {
  const negate = (map: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(map).map(([id, v]) => [id, -v]));
  return {
    accounts: negate(delta.accounts),
    cards: negate(delta.cards),
    loans: negate(delta.loans),
  };
}

/** El efecto de eliminar una transacción es el inverso de su efecto. */
export function revertTransaction(txn: TransactionDraft): LedgerDelta {
  return invertDelta(transactionDelta(txn));
}

/** El efecto de editar = revertir la vieja y aplicar la nueva (§9.3). */
export function editTransactionDelta(
  oldTxn: TransactionDraft,
  newTxn: TransactionDraft,
): LedgerDelta {
  return mergeDeltas(revertTransaction(oldTxn), transactionDelta(newTxn));
}

/** Suma varios deltas en uno solo. */
export function mergeDeltas(...deltas: LedgerDelta[]): LedgerDelta {
  const result = emptyDelta();
  for (const d of deltas) {
    for (const [id, v] of Object.entries(d.accounts)) add(result.accounts, id, v);
    for (const [id, v] of Object.entries(d.cards)) add(result.cards, id, v);
    for (const [id, v] of Object.entries(d.loans)) add(result.loans, id, v);
  }
  return result;
}

/** Semillas de arranque para el recálculo total (valores del onboarding). */
export interface BalanceSeeds {
  accounts: Record<string, number>; // initialBalance por cuenta
  cards: Record<string, number>; // deuda inicial por tarjeta
  loans: Record<string, number>; // saldo inicial por crédito
}

export interface RecomputedBalances {
  accounts: Record<string, number>;
  cards: Record<string, number>;
  loans: Record<string, number>;
}

/**
 * Recálculo total (CLAUDE.md §9.3): reconstruye las cachés desde cero a partir de las
 * semillas del onboarding más todos los movimientos. Sirve para corregir si las cachés
 * llegan a divergir, y como prueba de consistencia.
 */
export function recomputeBalances(
  seeds: BalanceSeeds,
  transactions: TransactionDraft[],
): RecomputedBalances {
  const result: RecomputedBalances = {
    accounts: { ...seeds.accounts },
    cards: { ...seeds.cards },
    loans: { ...seeds.loans },
  };
  for (const txn of transactions) {
    const delta = transactionDelta(txn);
    for (const [id, v] of Object.entries(delta.accounts)) add(result.accounts, id, v);
    for (const [id, v] of Object.entries(delta.cards)) add(result.cards, id, v);
    for (const [id, v] of Object.entries(delta.loans)) add(result.loans, id, v);
  }
  return result;
}
