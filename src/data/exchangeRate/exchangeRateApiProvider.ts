// Fuente primaria: ExchangeRate-API endpoint abierto (sin key; requiere atribución
// discreta en la UI). CLAUDE.md §5.11. Endpoint: https://open.er-api.com/v6/latest/USD
// Devuelve ~160 monedas base USD en una sola respuesta; se guarda la tabla completa.
import type { ExchangeRateTable } from '../../domain/ExchangeRateTable';
import type { ExchangeRateProvider } from './ExchangeRateProvider';

interface ErApiResponse {
  result: string;
  time_last_update_utc?: string;
  rates: Record<string, number>;
}

/** Convierte la fecha del feed a 'YYYY-MM-DD'; si no viene, usa la fecha local de hoy. */
function toIsoDate(utc?: string): string {
  const d = utc ? new Date(utc) : new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export const exchangeRateApiProvider: ExchangeRateProvider = {
  async fetchUsdRates(): Promise<ExchangeRateTable> {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`ExchangeRate-API respondió ${res.status}`);
    const data = (await res.json()) as ErApiResponse;
    // Sin la tasa COP la tabla no sirve para esta app (la moneda interna es COP, §3).
    if (data.result !== 'success' || typeof data.rates?.COP !== 'number') {
      throw new Error('ExchangeRate-API no devolvió la tasa COP');
    }
    return {
      rates: data.rates,
      date: toIsoDate(data.time_last_update_utc),
      source: 'exchangerate-api',
    };
  },
};
