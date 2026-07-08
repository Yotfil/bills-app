import { describe, it, expect } from 'vitest';
import { foreignCardDelta } from '../foreignCardLedger';

// Tarjeta multimoneda (2026-07-07): un gasto/ajuste en divisa con tarjeta mueve el pool de SU moneda
// (foreignDebts[moneda]), no la deuda COP. El signo lo deriva el tipo; el delta lleva la moneda.

const card = (id: string) => ({ kind: 'card' as const, id });
const account = (id: string) => ({ kind: 'account' as const, id });

describe('foreignCardDelta', () => {
  it('gasto con tarjeta en divisa: sube la deuda de esa moneda', () => {
    expect(
      foreignCardDelta({
        type: 'expense',
        source: card('tc'),
        foreignCurrency: 'USD',
        foreignAmount: 52.1,
        adjustmentDirection: null,
      }),
    ).toEqual([{ cardId: 'tc', currency: 'USD', amount: 52.1 }]);
  });

  it('ajuste en divisa: aplica ± según la dirección (reconciliar esa moneda)', () => {
    const base = {
      type: 'adjustment' as const,
      source: card('tc'),
      foreignCurrency: 'EUR',
      foreignAmount: 30,
    };
    expect(foreignCardDelta({ ...base, adjustmentDirection: 'increase' })).toEqual([
      { cardId: 'tc', currency: 'EUR', amount: 30 },
    ]);
    expect(foreignCardDelta({ ...base, adjustmentDirection: 'decrease' })).toEqual([
      { cardId: 'tc', currency: 'EUR', amount: -30 },
    ]);
  });

  it('gasto en divisa con cuenta (no tarjeta): []', () => {
    expect(
      foreignCardDelta({
        type: 'expense',
        source: account('a'),
        foreignCurrency: 'USD',
        foreignAmount: 10,
        adjustmentDirection: null,
      }),
    ).toEqual([]);
  });

  it('sin foreignAmount o sin moneda: [] (gasto COP normal)', () => {
    expect(
      foreignCardDelta({
        type: 'expense',
        source: card('tc'),
        foreignCurrency: null,
        foreignAmount: null,
        adjustmentDirection: null,
      }),
    ).toEqual([]);
    expect(
      foreignCardDelta({
        type: 'expense',
        source: card('tc'),
        foreignCurrency: null,
        foreignAmount: 10,
        adjustmentDirection: null,
      }),
    ).toEqual([]);
  });

  it('otros tipos (income/transfer/debt_payment): []', () => {
    for (const type of ['income', 'transfer', 'debt_payment'] as const) {
      expect(
        foreignCardDelta({
          type,
          source: card('tc'),
          foreignCurrency: 'USD',
          foreignAmount: 10,
          adjustmentDirection: null,
        }),
      ).toEqual([]);
    }
  });
});
