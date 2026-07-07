import type { ExchangeRateTable } from '../../domain/ExchangeRateTable';

// Interfaz de la fuente de tasas (CLAUDE.md §5.11): encapsula la API concreta para poder
// cambiarla sin tocar la UI ni la lógica. Devuelve la tabla completa base USD (de ahí se
// deriva tanto la tasa USD→COP del dashboard como cualquier conversión X→COP).
export interface ExchangeRateProvider {
  fetchUsdRates(): Promise<ExchangeRateTable>;
}
