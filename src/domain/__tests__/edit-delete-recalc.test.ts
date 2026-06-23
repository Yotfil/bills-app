import { describe, it, expect } from 'vitest';
import {
  editTransactionDelta,
  recomputeBalances,
  revertTransaction,
  transactionDelta,
} from '../ledger';
import { accountRef, cardRef, makeTxn } from './fixtures';

// CLAUDE.md §12.1 — Editar/eliminar movimientos y recálculo total. Principio §2/§9.3: la
// fuente de verdad son los movimientos; las cachés se derivan.

describe('Editar una transacción', () => {
  it('cambiar el monto ajusta el saldo por la diferencia', () => {
    const oldTxn = makeTxn({ type: 'expense', amount: 50_000, source: accountRef('acc-1') });
    const newTxn = makeTxn({ type: 'expense', amount: 80_000, source: accountRef('acc-1') });
    const delta = editTransactionDelta(oldTxn, newTxn);
    // Antes restaba 50k; ahora resta 80k → efecto neto adicional: −30k.
    expect(delta.accounts['acc-1']).toBe(-30_000);
  });

  it('cambiar la cuenta origen mueve el efecto de una cuenta a otra', () => {
    const oldTxn = makeTxn({ type: 'expense', amount: 40_000, source: accountRef('acc-1') });
    const newTxn = makeTxn({ type: 'expense', amount: 40_000, source: accountRef('acc-2') });
    const delta = editTransactionDelta(oldTxn, newTxn);
    expect(delta.accounts['acc-1']).toBe(40_000); // se devuelve a acc-1
    expect(delta.accounts['acc-2']).toBe(-40_000); // se cobra a acc-2
  });
});

describe('Eliminar una transacción', () => {
  it('revierte por completo su efecto', () => {
    const txn = makeTxn({ type: 'expense', amount: 50_000, source: accountRef('acc-1') });
    expect(revertTransaction(txn).accounts['acc-1']).toBe(50_000); // contrario al −50k original
  });

  it('eliminar un expense con tarjeta baja de nuevo la deuda', () => {
    const txn = makeTxn({ type: 'expense', amount: 50_000, source: cardRef('card-1') });
    expect(transactionDelta(txn).cards['card-1']).toBe(50_000);
    expect(revertTransaction(txn).cards['card-1']).toBe(-50_000);
  });
});

describe('Recálculo total (§9.3)', () => {
  it('reconstruye las cachés desde las semillas + movimientos', () => {
    const seeds = { accounts: { 'acc-1': 1_000_000 }, cards: { 'card-1': 0 }, loans: {} };
    const txns = [
      makeTxn({ type: 'expense', amount: 50_000, source: accountRef('acc-1') }),
      makeTxn({
        type: 'income',
        amount: 200_000,
        source: null,
        destination: accountRef('acc-1'),
        categoryId: null,
      }),
      makeTxn({ type: 'expense', amount: 30_000, source: cardRef('card-1') }),
    ];
    const result = recomputeBalances(seeds, txns);
    expect(result.accounts['acc-1']).toBe(1_150_000); // 1.000.000 − 50.000 + 200.000
    expect(result.cards['card-1']).toBe(30_000);
  });

  it('coincide con aplicar los deltas uno a uno (consistencia)', () => {
    const seeds = { accounts: { 'acc-1': 500_000 }, cards: {}, loans: {} };
    const txns = [
      makeTxn({ type: 'expense', amount: 10_000, source: accountRef('acc-1') }),
      makeTxn({ type: 'expense', amount: 25_000, source: accountRef('acc-1') }),
    ];
    const manual = txns.reduce(
      (bal, t) => bal + (transactionDelta(t).accounts['acc-1'] ?? 0),
      500_000,
    );
    expect(recomputeBalances(seeds, txns).accounts['acc-1']).toBe(manual);
  });
});
