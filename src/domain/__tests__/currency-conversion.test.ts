import { describe, it, expect } from 'vitest';
import {
  copPerUnit,
  convertToCop,
  foreignToCop,
  listCurrencyCodes,
} from '../currencyConversion';
import type { ExchangeRateTable } from '../ExchangeRateTable';

// §5.11 — Conversión divisa→COP con la tabla base USD (cruce X→USD→COP).

const table: ExchangeRateTable = {
  rates: { USD: 1, COP: 4000, EUR: 0.8, JPY: 150, BTC: 0.00002 },
  date: '2026-07-03',
  source: 'exchangerate-api',
};

describe('copPerUnit', () => {
  it('USD→COP es directo: la tasa COP de la tabla', () => {
    expect(copPerUnit(table, 'USD')).toBe(4000);
  });

  it('cruza otra divisa vía USD: EUR→COP = COP/EUR', () => {
    expect(copPerUnit(table, 'EUR')).toBe(5000); // 4000 / 0.8
  });

  it('COP→COP es identidad (tasa 1)', () => {
    expect(copPerUnit(table, 'COP')).toBe(1);
  });

  it('devuelve null si la moneda no está en la tabla', () => {
    expect(copPerUnit(table, 'XYZ')).toBeNull();
  });

  it('devuelve null si la tabla no trae COP', () => {
    const sinCop: ExchangeRateTable = { ...table, rates: { USD: 1, EUR: 0.8 } };
    expect(copPerUnit(sinCop, 'EUR')).toBeNull();
  });
});

describe('convertToCop', () => {
  it('convierte un monto en divisa a COP entero', () => {
    expect(convertToCop(12782, 'USD', table)).toBe(51_128_000);
  });

  it('redondea a entero (los montos COP no llevan decimales, §3)', () => {
    // 10.5 JPY→COP: 10.5 × (4000/150) = 280.0; 10.4 × 26.666... = 277.33 → 277
    expect(convertToCop(10.4, 'JPY', table)).toBe(277);
  });

  it('devuelve null si no hay tasa para la moneda', () => {
    expect(convertToCop(100, 'XYZ', table)).toBeNull();
  });
});

describe('foreignToCop', () => {
  it('multiplica por la tasa ya resuelta y redondea', () => {
    expect(foreignToCop(9918.55, 4000)).toBe(39_674_200);
    expect(foreignToCop(0.4, 4001)).toBe(1600); // 1600.4 → 1600
  });
});

describe('listCurrencyCodes', () => {
  it('devuelve los códigos de 3 letras ordenados alfabéticamente', () => {
    expect(listCurrencyCodes(table)).toEqual(['BTC', 'COP', 'EUR', 'JPY', 'USD']);
  });

  it('filtra claves que no son código ISO de 3 letras (cripto/tokens del fallback)', () => {
    const conTokens: ExchangeRateTable = {
      ...table,
      rates: { USD: 1, COP: 4000, '1INCH': 2, DOGE20: 1 },
    };
    expect(listCurrencyCodes(conTokens)).toEqual(['COP', 'USD']);
  });
});
