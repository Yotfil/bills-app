// Fuente de respaldo: currency-api (@fawazahmed0, sin API key, soporta COP). CLAUDE.md §5.11.
// Tiene un mirror; si el primero falla, intenta el segundo. Sus claves vienen en minúscula e
// incluyen cripto/tokens: se normalizan a MAYÚSCULA para que coincidan con las de la fuente
// primaria (el filtrado a códigos de 3 letras lo hace el dominio al listar).
import type { ExchangeRateTable } from '../../domain/ExchangeRateTable';
import type { ExchangeRateProvider } from './ExchangeRateProvider';

interface CurrencyApiResponse {
  date: string;
  usd: Record<string, number>;
}

const ENDPOINTS = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
];

function toUpperCaseRates(raw: Record<string, number>): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(raw)) {
    if (typeof value === 'number') rates[code.toUpperCase()] = value;
  }
  return rates;
}

export const currencyApiProvider: ExchangeRateProvider = {
  async fetchUsdRates(): Promise<ExchangeRateTable> {
    let lastError: unknown;
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`currency-api respondió ${res.status}`);
        const data = (await res.json()) as CurrencyApiResponse;
        const rates = toUpperCaseRates(data.usd ?? {});
        if (typeof rates.COP !== 'number') throw new Error('currency-api no devolvió la tasa COP');
        return { rates, date: data.date, source: 'currency-api' };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('currency-api no disponible');
  },
};
