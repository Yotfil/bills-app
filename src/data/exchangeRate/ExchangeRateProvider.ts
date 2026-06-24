import type { ExchangeRate } from '../../domain/ExchangeRate';

// Fuente de la tasa USD→COP, detrás de una interfaz para poder cambiarla sin tocar la UI
// (CLAUDE.md §5.11). Cada implementación obtiene la tasa de su API.
export interface ExchangeRateProvider {
  fetchUsdToCop(): Promise<ExchangeRate>;
}
