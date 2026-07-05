import { describe, it, expect, vi } from 'vitest';
import { resolveUsdRateTable } from '../../data/exchangeRate/resolveUsdRateTable';
import type { ExchangeRateTable } from '../ExchangeRateTable';
import type { ExchangeRateProvider } from '../../data/exchangeRate/ExchangeRateProvider';
import type { CachedRateTable } from '../../data/exchangeRate/CachedRateTable';
import type { RateCacheStore } from '../../data/exchangeRate/RateCacheStore';

// CLAUDE.md §5.11 / §12.1 — Tabla de tasas base USD: caché diaria, fallback y degradado.

const primary: ExchangeRateTable = {
  rates: { COP: 4100, EUR: 0.8 },
  date: '2026-06-23',
  source: 'exchangerate-api',
};
const fallback: ExchangeRateTable = {
  rates: { COP: 4090, EUR: 0.81 },
  date: '2026-06-23',
  source: 'currency-api',
};

function provider(value: ExchangeRateTable | Error): ExchangeRateProvider {
  return {
    fetchUsdRates: () => (value instanceof Error ? Promise.reject(value) : Promise.resolve(value)),
  };
}

function memoryStore(initial: CachedRateTable | null = null): RateCacheStore {
  let cache = initial;
  return {
    read: () => cache,
    write: (r) => {
      cache = r;
    },
  };
}

describe('resolveUsdRateTable', () => {
  it('usa la fuente primaria (ExchangeRate-API) cuando responde', async () => {
    const result = await resolveUsdRateTable(
      [provider(primary), provider(fallback)],
      memoryStore(),
      '2026-06-23',
    );
    expect(result?.source).toBe('exchangerate-api');
    expect(result?.rates.COP).toBe(4100);
  });

  it('usa el fallback (currency-api) si la primaria falla', async () => {
    const result = await resolveUsdRateTable(
      [provider(new Error('caída')), provider(fallback)],
      memoryStore(),
      '2026-06-23',
    );
    expect(result?.source).toBe('currency-api');
  });

  it('cachea con su fecha y NO vuelve a pedir el mismo día', async () => {
    const store = memoryStore();
    const spy = vi.fn(() => Promise.resolve(primary));
    const p: ExchangeRateProvider = { fetchUsdRates: spy };
    await resolveUsdRateTable([p], store, '2026-06-23'); // primera vez: pide
    await resolveUsdRateTable([p], store, '2026-06-23'); // segunda vez: usa caché
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('vuelve a pedir cuando cambia el día', async () => {
    const store = memoryStore();
    const spy = vi.fn(() => Promise.resolve(primary));
    const p: ExchangeRateProvider = { fetchUsdRates: spy };
    await resolveUsdRateTable([p], store, '2026-06-23');
    await resolveUsdRateTable([p], store, '2026-06-24');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('sin conexión, degrada con la última tabla cacheada', async () => {
    const stale: CachedRateTable = {
      rates: { COP: 4050 },
      date: '2026-06-20',
      source: 'exchangerate-api',
      fetchedAt: '2026-06-20',
    };
    const result = await resolveUsdRateTable(
      [provider(new Error('sin red')), provider(new Error('sin red'))],
      memoryStore(stale),
      '2026-06-23',
    );
    expect(result?.rates.COP).toBe(4050);
    expect(result?.date).toBe('2026-06-20');
  });

  it('sin caché y sin red, devuelve null', async () => {
    const result = await resolveUsdRateTable(
      [provider(new Error('x'))],
      memoryStore(),
      '2026-06-23',
    );
    expect(result).toBeNull();
  });
});
