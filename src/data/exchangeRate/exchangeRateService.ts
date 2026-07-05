// Servicio de tasas de cambio (CLAUDE.md §5.11): cablea las fuentes reales (ExchangeRate-API →
// currency-api) con la caché diaria de localStorage. La UI llama solo a esto. Un único fetch
// diario trae la tabla completa base USD; la tasa USD→COP del dashboard se deriva de ella.
import { resolveUsdRateTable } from './resolveUsdRateTable';
import { exchangeRateApiProvider } from './exchangeRateApiProvider';
import { currencyApiProvider } from './currencyApiProvider';
import { localStorageRateCache } from './localStorageRateCache';
import { todayIsoDate } from '../../lib/date';
import type { ExchangeRate } from '../../domain/ExchangeRate';
import type { ExchangeRateTable } from '../../domain/ExchangeRateTable';

// Orden de fuentes (ambas soportan COP, sin API key): ExchangeRate-API → currency-api.
export function getUsdRateTable(): Promise<ExchangeRateTable | null> {
  return resolveUsdRateTable(
    [exchangeRateApiProvider, currencyApiProvider],
    localStorageRateCache,
    todayIsoDate(),
  );
}

/** Tasa USD→COP de referencia (dashboard). Derivada de la tabla: misma caché, mismo fetch. */
export async function getUsdToCopRate(): Promise<ExchangeRate | null> {
  const table = await getUsdRateTable();
  const rate = table?.rates['COP'];
  if (!table || typeof rate !== 'number') return null;
  return { rate, date: table.date, source: table.source };
}
