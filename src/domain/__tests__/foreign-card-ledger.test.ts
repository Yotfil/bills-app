import { describe, it, expect } from 'vitest';
import { foreignCardDelta } from '../foreignCardLedger';

// Tarjeta mixta (gastos en divisa, 2026-07-07): un gasto/ajuste en divisa con tarjeta mueve el pool
// en divisa (cachedForeignDebt), no la deuda COP. El signo lo deriva el tipo.

const card = (id: string) => ({ kind: 'card' as const, id });
const account = (id: string) => ({ kind: 'account' as const, id });

describe('foreignCardDelta', () => {
  it('gasto con tarjeta en divisa: sube la deuda en divisa', () => {
    expect(
      foreignCardDelta({
        type: 'expense',
        source: card('tc'),
        foreignAmount: 52.1,
        adjustmentDirection: null,
      }),
    ).toEqual([{ cardId: 'tc', amount: 52.1 }]);
  });

  it('ajuste en divisa: aplica ± según la dirección (reconciliar deuda en USD)', () => {
    const base = { type: 'adjustment' as const, source: card('tc'), foreignAmount: 3267 };
    expect(foreignCardDelta({ ...base, adjustmentDirection: 'increase' })).toEqual([
      { cardId: 'tc', amount: 3267 },
    ]);
    expect(foreignCardDelta({ ...base, adjustmentDirection: 'decrease' })).toEqual([
      { cardId: 'tc', amount: -3267 },
    ]);
  });

  it('gasto en divisa con cuenta (no tarjeta): []', () => {
    expect(
      foreignCardDelta({
        type: 'expense',
        source: account('a'),
        foreignAmount: 10,
        adjustmentDirection: null,
      }),
    ).toEqual([]);
  });

  it('sin foreignAmount: [] (gasto COP normal)', () => {
    expect(
      foreignCardDelta({
        type: 'expense',
        source: card('tc'),
        foreignAmount: null,
        adjustmentDirection: null,
      }),
    ).toEqual([]);
  });

  it('otros tipos (income/transfer/debt_payment): []', () => {
    for (const type of ['income', 'transfer', 'debt_payment'] as const) {
      expect(
        foreignCardDelta({ type, source: card('tc'), foreignAmount: 10, adjustmentDirection: null }),
      ).toEqual([]);
    }
  });
});
