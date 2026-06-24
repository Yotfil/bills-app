import { describe, it, expect, vi } from 'vitest';
import { resolveUsdToCopRate } from '../../data/exchangeRate/resolveUsdToCopRate';
import type { ExchangeRate } from '../ExchangeRate';
import type { ExchangeRateProvider } from '../../data/exchangeRate/ExchangeRateProvider';
import type { CachedRate } from '../../data/exchangeRate/CachedRate';
import type { RateCacheStore } from '../../data/exchangeRate/RateCacheStore';

// CLAUDE.md §5.11 / §12.1 — Tasa USD→COP: caché diaria, fallback y degradado.

const primary: ExchangeRate = { rate: 4100, date: '2026-06-23', source: 'exchangerate-api' };
const fallback: ExchangeRate = { rate: 4090, date: '2026-06-23', source: 'currency-api' };

function provider(value: ExchangeRate | Error): ExchangeRateProvider {
  return {
    fetchUsdToCop: () => (value instanceof Error ? Promise.reject(value) : Promise.resolve(value)),
  };
}

function memoryStore(initial: CachedRate | null = null): RateCacheStore {
  let cache = initial;
  return {
    read: () => cache,
    write: (r) => {
      cache = r;
    },
  };
}

describe('resolveUsdToCopRate', () => {
  it('usa la fuente primaria (ExchangeRate-API) cuando responde', async () => {
    const result = await resolveUsdToCopRate(
      [provider(primary), provider(fallback)],
      memoryStore(),
      '2026-06-23',
    );
    expect(result?.source).toBe('exchangerate-api');
    expect(result?.rate).toBe(4100);
  });

  it('usa el fallback (currency-api) si la primaria falla', async () => {
    const result = await resolveUsdToCopRate(
      [provider(new Error('caída')), provider(fallback)],
      memoryStore(),
      '2026-06-23',
    );
    expect(result?.source).toBe('currency-api');
  });

  it('cachea con su fecha y NO vuelve a pedir el mismo día', async () => {
    const store = memoryStore();
    const spy = vi.fn(() => Promise.resolve(primary));
    const p: ExchangeRateProvider = { fetchUsdToCop: spy };
    await resolveUsdToCopRate([p], store, '2026-06-23'); // primera vez: pide
    await resolveUsdToCopRate([p], store, '2026-06-23'); // segunda vez: usa caché
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('vuelve a pedir cuando cambia el día', async () => {
    const store = memoryStore();
    const spy = vi.fn(() => Promise.resolve(primary));
    const p: ExchangeRateProvider = { fetchUsdToCop: spy };
    await resolveUsdToCopRate([p], store, '2026-06-23');
    await resolveUsdToCopRate([p], store, '2026-06-24');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('sin conexión, degrada con la última tasa cacheada', async () => {
    const stale: CachedRate = {
      rate: 4050,
      date: '2026-06-20',
      source: 'exchangerate-api',
      fetchedAt: '2026-06-20',
    };
    const result = await resolveUsdToCopRate(
      [provider(new Error('sin red')), provider(new Error('sin red'))],
      memoryStore(stale),
      '2026-06-23',
    );
    expect(result?.rate).toBe(4050);
    expect(result?.date).toBe('2026-06-20');
  });

  it('sin caché y sin red, devuelve null', async () => {
    const result = await resolveUsdToCopRate(
      [provider(new Error('x'))],
      memoryStore(),
      '2026-06-23',
    );
    expect(result).toBeNull();
  });
});
