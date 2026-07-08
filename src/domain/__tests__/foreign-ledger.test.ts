import { describe, it, expect } from 'vitest';
import { foreignDelta, buildForeignReconcileNote } from '../foreignLedger';

// Decisión 2026-07-09 — ledger en divisa: cada movimiento en divisa mueve Account.foreignAmount
// (la fuente de verdad); el lado se deriva del tipo. Cuentas COP / movimientos sin divisa → [].

const acc = (id: string) => ({ kind: 'account' as const, id });

describe('foreignDelta', () => {
  it('income: suma el monto original a la cuenta destino (compat con foreignIncomeDelta)', () => {
    expect(
      foreignDelta({
        type: 'income',
        source: null,
        destination: acc('acc-1'),
        foreignAmount: 100.5,
        adjustmentDirection: null,
      }),
    ).toEqual([{ accountId: 'acc-1', amount: 100.5 }]);
  });

  it('expense: resta el monto de la cuenta origen', () => {
    expect(
      foreignDelta({
        type: 'expense',
        source: acc('acc-usd'),
        destination: null,
        foreignAmount: 52.1,
        adjustmentDirection: null,
      }),
    ).toEqual([{ accountId: 'acc-usd', amount: -52.1 }]);
  });

  it('expense con tarjeta como origen: sin delta (las tarjetas son COP)', () => {
    expect(
      foreignDelta({
        type: 'expense',
        source: { kind: 'card', id: 'card-1' },
        destination: null,
        foreignAmount: 10,
        adjustmentDirection: null,
      }),
    ).toEqual([]);
  });

  it('transfer misma moneda: resta al origen y suma al destino (neto cero)', () => {
    expect(
      foreignDelta({
        type: 'transfer',
        source: acc('usd-a'),
        destination: acc('usd-b'),
        foreignAmount: 200,
        adjustmentDirection: null,
      }),
    ).toEqual([
      { accountId: 'usd-a', amount: -200 },
      { accountId: 'usd-b', amount: 200 },
    ]);
  });

  it('adjustment: aplica ± a la cuenta origen según la dirección (reconciliación en divisa)', () => {
    const base = {
      type: 'adjustment' as const,
      source: acc('acc-usd'),
      destination: null,
      foreignAmount: 3267,
    };
    expect(foreignDelta({ ...base, adjustmentDirection: 'decrease' })).toEqual([
      { accountId: 'acc-usd', amount: -3267 },
    ]);
    expect(foreignDelta({ ...base, adjustmentDirection: 'increase' })).toEqual([
      { accountId: 'acc-usd', amount: 3267 },
    ]);
  });

  it('debt_payment: nunca aplica delta (las deudas son COP)', () => {
    expect(
      foreignDelta({
        type: 'debt_payment',
        source: acc('acc-usd'),
        destination: { kind: 'card', id: 'card-1' },
        foreignAmount: 100,
        adjustmentDirection: null,
      }),
    ).toEqual([]);
  });

  it('sin foreignAmount: [] (movimientos COP intactos)', () => {
    expect(
      foreignDelta({
        type: 'income',
        source: null,
        destination: acc('acc-1'),
        foreignAmount: null,
        adjustmentDirection: null,
      }),
    ).toEqual([]);
    expect(
      foreignDelta({
        type: 'income',
        source: null,
        destination: acc('acc-1'),
        foreignAmount: undefined,
        adjustmentDirection: null,
      }),
    ).toEqual([]);
  });

  it('income sin cuenta destino: []', () => {
    expect(
      foreignDelta({
        type: 'income',
        source: null,
        destination: null,
        foreignAmount: 100,
        adjustmentDirection: null,
      }),
    ).toEqual([]);
  });
});

describe('buildForeignReconcileNote', () => {
  it('incluye moneda y tasa formateada', () => {
    expect(buildForeignReconcileNote('USD', 4000)).toBe('Reconciliación en USD (tasa 4.000)');
  });
});
