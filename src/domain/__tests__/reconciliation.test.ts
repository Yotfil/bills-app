import { describe, it, expect } from 'vitest';
import { buildReconciliationAdjustment, computeReconciliation } from '../reconciliation';
import { transactionDelta } from '../ledger';
import { accountRef, STUB_TS } from './fixtures';

// CLAUDE.md §12.1 — Reconciliación de cuentas (§5.7).

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
      account: accountRef('acc-1'),
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
      account: accountRef('acc-1'),
      adjustmentCategoryId: 'cat-ajuste',
      date: STUB_TS,
    })!;
    const delta = transactionDelta(adj);
    expect(800_000 + delta.accounts['acc-1']!).toBe(850_000);
  });
});
