// Conversión de divisas a COP con la tabla de tasas base USD (§5.11). Funciones puras:
// la app sigue siendo COP-only (§3); esto solo traduce el monto anotado en divisa
// (Account.foreignAmount) a su equivalente en pesos.
import type { ExchangeRateTable } from './ExchangeRateTable';

/**
 * Cuántos COP vale 1 unidad de `currency`, cruzando por USD: X→USD→COP = COP/X.
 * Devuelve null si la tabla no trae alguna de las dos monedas (o la tasa es inválida).
 */
export function copPerUnit(table: ExchangeRateTable, currency: string): number | null {
  if (currency === 'COP') return 1;
  const cop = table.rates['COP'];
  const unitsPerUsd = table.rates[currency];
  if (typeof cop !== 'number' || typeof unitsPerUsd !== 'number' || unitsPerUsd <= 0) return null;
  return cop / unitsPerUsd;
}

/** Convierte un monto en divisa a COP entero con una tasa divisa→COP ya resuelta. */
export function foreignToCop(amount: number, rateToCop: number): number {
  // Redondeo obligatorio: los montos COP del dominio son enteros (§3).
  return Math.round(amount * rateToCop);
}

/** Convierte `amount` de `currency` a COP entero; null si no hay tasa para esa moneda. */
export function convertToCop(
  amount: number,
  currency: string,
  table: ExchangeRateTable,
): number | null {
  const rate = copPerUnit(table, currency);
  return rate === null ? null : foreignToCop(amount, rate);
}

/**
 * Códigos de moneda disponibles en la tabla, ordenados alfabéticamente. Se filtra a códigos
 * ISO de 3 letras porque el fallback (currency-api) incluye también cripto/tokens con claves
 * más largas que no aplican a una cuenta bancaria.
 */
export function listCurrencyCodes(table: ExchangeRateTable): string[] {
  return Object.keys(table.rates)
    .filter((code) => /^[A-Z]{3}$/.test(code))
    .sort();
}
