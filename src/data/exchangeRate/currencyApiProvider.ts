// Fuente de respaldo: currency-api (@fawazahmed0, sin API key, soporta COP). CLAUDE.md §5.11.
// Tiene un mirror; si el primero falla, intenta el segundo.
import type { ExchangeRate } from '../../domain/ExchangeRate';
import type { ExchangeRateProvider } from './ExchangeRateProvider';

interface CurrencyApiResponse {
  date: string;
  usd: { cop?: number };
}

const ENDPOINTS = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
];

export const currencyApiProvider: ExchangeRateProvider = {
  async fetchUsdToCop(): Promise<ExchangeRate> {
    let lastError: unknown;
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`currency-api respondió ${res.status}`);
        const data = (await res.json()) as CurrencyApiResponse;
        const rate = data.usd?.cop;
        if (typeof rate !== 'number') throw new Error('currency-api no devolvió la tasa COP');
        return { rate, date: data.date, source: 'currency-api' };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('currency-api no disponible');
  },
};
