// Servicio de la tasa USD→COP (CLAUDE.md §5.11): cablea las fuentes reales (Frankfurter →
// ExchangeRate-API) con la caché de localStorage y la fecha de hoy. La UI llama solo a esto.
import { resolveUsdToCopRate } from './resolveUsdToCopRate';
import { exchangeRateApiProvider } from './exchangeRateApiProvider';
import { currencyApiProvider } from './currencyApiProvider';
import { localStorageRateCache } from './localStorageRateCache';
import { todayIsoDate } from '../../lib/date';
import type { ExchangeRate } from '../../domain/ExchangeRate';

// Orden de fuentes (ambas soportan COP, sin API key): ExchangeRate-API → currency-api.
export function getUsdToCopRate(): Promise<ExchangeRate | null> {
  return resolveUsdToCopRate(
    [exchangeRateApiProvider, currencyApiProvider],
    localStorageRateCache,
    todayIsoDate(),
  );
}
