// Tasa de cambio de referencia USD→COP (CLAUDE.md §5.11). Solo informativa: NO convierte
// movimientos; la moneda interna sigue siendo COP.
//
// NOTA: el §5.11 proponía Frankfurter como fuente primaria, pero Frankfurter solo cubre las
// monedas del BCE y NO incluye COP (devuelve "not found"). Por eso usamos fuentes que sí
// soportan COP, sin API key: ExchangeRate-API (primaria) y currency-api (respaldo).
export type ExchangeRateSource = 'exchangerate-api' | 'currency-api';

export interface ExchangeRate {
  rate: number; // cuántos COP vale 1 USD
  date: string; // fecha del dato 'YYYY-MM-DD' (estos feeds publican 1 vez por día hábil)
  source: ExchangeRateSource;
}
