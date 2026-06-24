import { describe, it, expect } from 'vitest';
import { buildReconciliationAdjustment, computeReconciliation } from '../reconciliation';
import { transactionDelta } from '../ledger';
import { accountRef, cardRef, loanRef, STUB_TS } from './fixtures';

// CLAUDE.md §12.1 — Reconciliación de cuentas, tarjetas y créditos (§5.7).

describe('Reconciliación de cuenta', () => {
  it('saldo real MAYOR al registrado → ajuste increase por el desfase exacto', () => {
    const result = computeReconciliation(800_000, 850_000);
    expect(result).toEqual({ direction: 'increase', amount: 50_000 });
  });

  it('saldo real MENOR al registrado → ajuste decrease por el desfase exacto', () => {
    const result = computeReconciliation(800_000, 760_000);
    expect(result).toEqual({ direction: 'decrease', amount: 40_000 });
  });

  it('sin desfase → no crea movimiento', () => {
    expect(computeReconciliation(800_000, 800_000)).toBeNull();
  });

  it('el ajuste usa la categoría de sistema "Ajuste" y guarda la nota', () => {
    const adj = buildReconciliationAdjustment(800_000, 850_000, {
      source: accountRef('acc-1'),
      adjustmentCategoryId: 'cat-ajuste',
      date: STUB_TS,
      note: 'olvidé registrar efectivo',
    });
    expect(adj?.type).toBe('adjustment');
    expect(adj?.categoryId).toBe('cat-ajuste');
    expect(adj?.note).toBe('olvidé registrar efectivo');
  });

  it('tras aplicar el ajuste, el saldo registrado coincide con el real', () => {
    const adj = buildReconciliationAdjustment(800_000, 850_000, {
      source: accountRef('acc-1'),
      adjustmentCategoryId: 'cat-ajuste',
      date: STUB_TS,
    })!;
    const delta = transactionDelta(adj);
    expect(800_000 + delta.accounts['acc-1']!).toBe(850_000);
  });
});

describe('Reconciliación de tarjeta de crédito (deuda)', () => {
  it('deuda real MAYOR (intereses) → ajuste increase sube la deuda hasta el real', () => {
    const adj = buildReconciliationAdjustment(500_000, 512_625, {
      source: cardRef('card-1'),
      adjustmentCategoryId: 'cat-ajuste',
      date: STUB_TS,
    })!;
    expect(adj.adjustmentDirection).toBe('increase');
    const delta = transactionDelta(adj);
    expect(500_000 + delta.cards['card-1']!).toBe(512_625);
    expect(delta.accounts['card-1']).toBeUndefined(); // no toca cuentas
  });

  it('deuda real MENOR → ajuste decrease baja la deuda hasta el real', () => {
    const adj = buildReconciliationAdjustment(500_000, 450_000, {
      source: cardRef('card-1'),
      adjustmentCategoryId: 'cat-ajuste',
      date: STUB_TS,
    })!;
    expect(adj.adjustmentDirection).toBe('decrease');
    const delta = transactionDelta(adj);
    expect(500_000 + delta.cards['card-1']!).toBe(450_000);
  });
});

describe('Reconciliación de crédito (saldo)', () => {
  it('saldo real distinto → el ajuste lleva el saldo del crédito al real', () => {
    const adj = buildReconciliationAdjustment(61_000_000, 61_884_141, {
      source: loanRef('loan-1'),
      adjustmentCategoryId: 'cat-ajuste',
      date: STUB_TS,
    })!;
    expect(adj.adjustmentDirection).toBe('increase');
    const delta = transactionDelta(adj);
    expect(61_000_000 + delta.loans['loan-1']!).toBe(61_884_141);
  });
});
