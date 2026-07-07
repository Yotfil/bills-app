import { describe, it, expect } from 'vitest';
import { accountBalanceCop, accountCopRate, copToForeign } from '../foreignBalance';
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

describe('copToForeign', () => {
  it('convierte COP a divisa con 2 decimales para display', () => {
    expect(copToForeign(51_128_000, 4000)).toBe(12782);
    expect(copToForeign(402_000, 4000)).toBe(100.5);
    expect(copToForeign(1000, 3999)).toBe(0.25); // 0.25006... → 0.25
  });
});
