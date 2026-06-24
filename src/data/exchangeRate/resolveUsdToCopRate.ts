// Resolución de la tasa USD→COP con caché diaria y degradado (CLAUDE.md §5.11). Pura respecto
// a la fuente y al almacén (se inyectan), por eso es testeable sin red ni localStorage.
//
// Reglas: 1) si ya se consultó HOY, devuelve la caché (no pide otra vez). 2) si no, intenta
// los providers en orden (Frankfurter → fallback). 3) si todos fallan, degrada con gracia
// devolviendo la última tasa cacheada (aunque sea de otro día). 4) si no hay nada, null.
import type { ExchangeRate } from '../../domain/ExchangeRate';
import type { ExchangeRateProvider } from './ExchangeRateProvider';
import type { RateCacheStore } from './RateCacheStore';

export async function resolveUsdToCopRate(
  providers: ExchangeRateProvider[],
  store: RateCacheStore,
  today: string,
): Promise<ExchangeRate | null> {
  const cached = store.read();
  if (cached && cached.fetchedAt === today) {
    return { rate: cached.rate, date: cached.date, source: cached.source };
  }

  for (const provider of providers) {
    try {
      const fresh = await provider.fetchUsdToCop();
      store.write({ ...fresh, fetchedAt: today });
      return fresh;
    } catch {
      // intenta el siguiente provider
    }
  }

  // Sin red / todos fallaron: degradar mostrando la última cacheada (si existe).
  return cached ? { rate: cached.rate, date: cached.date, source: cached.source } : null;
}
