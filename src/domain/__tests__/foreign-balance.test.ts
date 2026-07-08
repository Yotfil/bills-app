import { describe, it, expect } from 'vitest';
import {
  accountBalanceCop,
  accountCopRate,
  cardForeignDebtEntries,
  cardTotalDebtCop,
  copToForeign,
} from '../foreignBalance';
import { accountAvailable, cardAvailableCredit, disponibleReal } from '../derived';
import { makeAccount, makeCard } from './fixtures';
import type { ExchangeRateTable } from '../ExchangeRateTable';

// Decisión 2026-07-09 — saldo COP en vivo: la cuenta en divisa vive en su moneda y el COP
// mostrado es la conversión con la tasa del día (fallback a cachedBalance sin tasa).

const table: ExchangeRateTable = {
  rates: { USD: 1, COP: 4000, EUR: 0.8 },
  date: '2026-07-09',
  source: 'exchangerate-api',
};

describe('accountCopRate', () => {
  it('resuelve la tasa divisa→COP de la cuenta', () => {
    expect(accountCopRate({ foreignCurrency: 'USD' }, table)).toBe(4000);
    expect(accountCopRate({ foreignCurrency: 'EUR' }, table)).toBe(5000);
  });

  it('cuenta COP o sin tabla → null', () => {
    expect(accountCopRate({ foreignCurrency: null }, table)).toBeNull();
    expect(accountCopRate({ foreignCurrency: 'USD' }, null)).toBeNull();
  });
});

describe('accountBalanceCop', () => {
  it('cuenta COP: devuelve cachedBalance tal cual', () => {
    const account = { cachedBalance: 1_000_000, foreignCurrency: null, foreignAmount: null };
    expect(accountBalanceCop(account, table)).toBe(1_000_000);
  });

  it('cuenta en divisa con tasa: conversión EN VIVO (ignora cachedBalance)', () => {
    const account = { cachedBalance: 99, foreignCurrency: 'USD', foreignAmount: 12782 };
    expect(accountBalanceCop(account, table)).toBe(51_128_000);
  });

  it('redondea a COP entero (§3)', () => {
    const account = { cachedBalance: 0, foreignCurrency: 'USD', foreignAmount: 100.5555 };
    expect(accountBalanceCop(account, table)).toBe(402_222); // 100.5555 × 4000 = 402222.0
  });

  it('degradado: sin tabla o sin tasa para la moneda, cae a cachedBalance', () => {
    const account = { cachedBalance: 34_051_370, foreignCurrency: 'USD', foreignAmount: 12782 };
    expect(accountBalanceCop(account, null)).toBe(34_051_370);
    const sinTasa: ExchangeRateTable = { ...table, rates: { USD: 1 } };
    expect(accountBalanceCop(account, sinTasa)).toBe(34_051_370);
  });

  it('cuenta con divisa pero sin monto anotado, cae a cachedBalance', () => {
    const account = { cachedBalance: 500, foreignCurrency: 'USD', foreignAmount: null };
    expect(accountBalanceCop(account, table)).toBe(500);
  });
});

describe('derivados con cuentas en divisa (accountAvailable / disponibleReal)', () => {
  it('el disponible de una cuenta en divisa usa el COP en vivo', () => {
    const usd = makeAccount({ id: 'usd-1', cachedBalance: 1, foreignCurrency: 'USD', foreignAmount: 100 });
    expect(accountAvailable(usd, [], table)).toBe(400_000);
  });

  it('el disponible real suma cuentas COP y en divisa con la conversión del día', () => {
    const cop = makeAccount({ id: 'cop-1', cachedBalance: 1_000_000 });
    const usd = makeAccount({ id: 'usd-1', cachedBalance: 1, foreignCurrency: 'USD', foreignAmount: 100 });
    expect(disponibleReal([cop, usd], [], table)).toBe(1_400_000);
  });

  it('con table = null todo cae al comportamiento histórico (cachedBalance)', () => {
    const usd = makeAccount({ id: 'usd-1', cachedBalance: 777, foreignCurrency: 'USD', foreignAmount: 100 });
    expect(disponibleReal([usd], [], null)).toBe(777);
  });
});

describe('copToForeign', () => {
  it('convierte COP a divisa con 2 decimales para display', () => {
    expect(copToForeign(51_128_000, 4000)).toBe(12782);
    expect(copToForeign(402_000, 4000)).toBe(100.5);
    expect(copToForeign(1000, 3999)).toBe(0.25); // 0.25006... → 0.25
  });
});

// Tarjeta multimoneda (2026-07-07): la deuda total ≈ COP suma la deuda COP más CADA deuda en divisa
// convertida en vivo; el disponible se deriva de esa deuda total.
describe('cardForeignDebtEntries', () => {
  it('lista las deudas en divisa ≠ 0, ordenadas por moneda', () => {
    const card = makeCard({ foreignDebts: { USD: 100, EUR: 30, GBP: 0 } });
    expect(cardForeignDebtEntries(card)).toEqual([
      { currency: 'EUR', amount: 30 },
      { currency: 'USD', amount: 100 },
    ]);
  });

  it('sin deudas en divisa → []', () => {
    expect(cardForeignDebtEntries(makeCard({}))).toEqual([]);
  });
});

describe('cardTotalDebtCop', () => {
  it('suma la deuda COP y cada deuda en divisa convertida con la tasa del día', () => {
    const card = makeCard({ cachedDebt: 500_000, foreignDebts: { USD: 100, EUR: 50 } });
    // 500.000 + 100×4.000 (USD) + 50×5.000 (EUR: COP/EUR = 4000/0.8) = 500.000 + 400.000 + 250.000
    expect(cardTotalDebtCop(card, table)).toBe(1_150_000);
  });

  it('tarjeta COP pura o sin deuda en divisa → solo cachedDebt', () => {
    expect(cardTotalDebtCop(makeCard({ cachedDebt: 300_000 }), table)).toBe(300_000);
    expect(cardTotalDebtCop(makeCard({ cachedDebt: 300_000, foreignDebts: { USD: 0 } }), table)).toBe(
      300_000,
    );
  });

  it('sin tasa (offline) → solo la parte COP que sí se puede afirmar', () => {
    const card = makeCard({ cachedDebt: 500_000, foreignDebts: { USD: 100 } });
    expect(cardTotalDebtCop(card, null)).toBe(500_000);
  });
});

describe('cardAvailableCredit con deuda multimoneda', () => {
  it('cupo − deuda total (COP + cada divisa convertida)', () => {
    const card = makeCard({
      creditLimit: 2_000_000,
      cachedDebt: 500_000,
      foreignDebts: { USD: 100 },
    });
    expect(cardAvailableCredit(card, table)).toBe(1_100_000); // 2.000.000 − 900.000
  });
});
