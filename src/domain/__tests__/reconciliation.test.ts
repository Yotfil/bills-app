import { describe, it, expect } from 'vitest';
import {
  buildForeignReconciliationAdjustment,
  buildReconciliationAdjustment,
  computeReconciliation,
} from '../reconciliation';
import { transactionDelta } from '../ledger';
import { foreignDelta } from '../foreignLedger';
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

// Decisión 2026-07-09 — reconciliar una cuenta en divisa crea UN ajuste EN LA DIVISA: el
// desfase se mide en la moneda de la cuenta y el amount COP es la conversión del día.
describe('Reconciliación en divisa', () => {
  const options = {
    source: accountRef('acc-usd'),
    adjustmentCategoryId: 'cat-ajuste',
    date: STUB_TS,
    note: null,
  };

  it('saldo real menor: ajuste decrease con el Δ en divisa y su COP convertido', () => {
    const adj = buildForeignReconciliationAdjustment(12_782, 9_515, 'USD', 3344, options);
    expect(adj?.adjustmentDirection).toBe('decrease');
    expect(adj?.foreignCurrency).toBe('USD');
    expect(adj?.foreignAmount).toBe(3_267);
    expect(adj?.amount).toBe(10_924_848); // 3.267 × 3.344
    // El ajuste mueve AMBOS ledgers: divisa (foreignDelta) y COP (transactionDelta).
    expect(foreignDelta(adj!)).toEqual([{ accountId: 'acc-usd', amount: -3_267 }]);
    expect(transactionDelta(adj!).accounts['acc-usd']).toBe(-10_924_848);
  });

  it('saldo real mayor: ajuste increase', () => {
    const adj = buildForeignReconciliationAdjustment(100, 150.5, 'USD', 4000, options);
    expect(adj?.adjustmentDirection).toBe('increase');
    expect(adj?.foreignAmount).toBe(50.5);
    expect(adj?.amount).toBe(202_000);
    expect(foreignDelta(adj!)).toEqual([{ accountId: 'acc-usd', amount: 50.5 }]);
  });

  it('sin desfase en la divisa → null (no se crea movimiento)', () => {
    expect(buildForeignReconciliationAdjustment(100, 100, 'USD', 4000, options)).toBeNull();
    // El ruido de coma flotante no cuenta como desfase (se redondea a centavos).
    expect(
      buildForeignReconciliationAdjustment(100.1, 100.10000000001, 'USD', 4000, options),
    ).toBeNull();
  });

  it('un Δ de centavos clampa el COP a mínimo 1 peso (§11: amount > 0)', () => {
    const adj = buildForeignReconciliationAdjustment(100, 100.01, 'USD', 0.5, options);
    expect(adj?.amount).toBe(1); // 0.01 × 0.5 = 0.005 → round 0 → clamp 1
  });

  it('sin nota, usa la nota por defecto con moneda y tasa', () => {
    const adj = buildForeignReconciliationAdjustment(100, 90, 'USD', 4000, options);
    expect(adj?.note).toBe('Reconciliación en USD (tasa 4.000)');
  });

  it('con nota del usuario, la conserva', () => {
    const adj = buildForeignReconciliationAdjustment(100, 90, 'USD', 4000, {
      ...options,
      note: 'comisión de la plataforma',
    });
    expect(adj?.note).toBe('comisión de la plataforma');
  });
});
