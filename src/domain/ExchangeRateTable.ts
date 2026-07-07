import type { ExchangeRateSource } from './ExchangeRate';

// Tabla diaria de tasas con base USD (§5.11): rates['COP'] = cuántos COP vale 1 USD,
// rates['EUR'] = cuántos EUR vale 1 USD, etc. De aquí se deriva cualquier conversión X→COP
// (ver currencyConversion.ts). La moneda interna de la app sigue siendo COP (§3).
export interface ExchangeRateTable {
  rates: Record<string, number>; // código ISO en MAYÚSCULA → unidades de esa moneda por 1 USD
  date: string; // fecha del dato 'YYYY-MM-DD' (los feeds publican 1 vez por día hábil)
  source: ExchangeRateSource;
}
