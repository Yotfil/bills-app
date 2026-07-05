import { describe, it, expect } from 'vitest';
import {
  computeRevaluation,
  buildRevaluationNote,
  buildForeignReconcileNote,
} from '../revaluation';
import { computeReconciliation } from '../reconciliation';
import { convertToCop } from '../currencyConversion';
import type { ExchangeRateTable } from '../ExchangeRateTable';

// §5.7 + decisión 2026-07-05 — Revaluación de cuentas en divisa: el monto en divisa es la
// fuente de verdad; el saldo COP se realinea con un ajuste según la tasa del día.

const table: ExchangeRateTable = {
  rates: { COP: 4000, USD: 1, EUR: 0.8 },
  date: '2026-07-03',
  source: 'exchangerate-api',
};

describe('computeRevaluation', () => {
  it('con drift devuelve el COP objetivo y la tasa usada', () => {
    const account = { cachedBalance: 34_051_370, foreignCurrency: 'USD', foreignAmount: 12782 };
    const result = computeRevaluation(account, table);
    expect(result).toEqual({ targetCop: 51_128_000, rateToCop: 4000 });
  });

  it('funciona también cuando el saldo debe BAJAR (tasa cayó)', () => {
    const account = { cachedBalance: 60_000_000, foreignCurrency: 'USD', foreignAmount: 12782 };
    expect(computeRevaluation(account, table)?.targetCop).toBe(51_128_000);
  });

  it('es idempotente: si el saldo ya está alineado, devuelve null', () => {
    const account = { cachedBalance: 51_128_000, foreignCurrency: 'USD', foreignAmount: 12782 };
    expect(computeRevaluation(account, table)).toBeNull();
  });

  it('cuenta sin divisa devuelve null (no aplica)', () => {
    expect(
      computeRevaluation({ cachedBalance: 100, foreignCurrency: null, foreignAmount: null }, table),
    ).toBeNull();
  });

  it('moneda sin tasa en la tabla devuelve null (degradado con gracia)', () => {
    expect(
      computeRevaluation({ cachedBalance: 100, foreignCurrency: 'XYZ', foreignAmount: 10 }, table),
    ).toBeNull();
  });

  it('redondea el objetivo a COP entero (§3), incluso con divisa decimal', () => {
    const account = { cachedBalance: 0, foreignCurrency: 'EUR', foreignAmount: 10.55 };
    // 10.55 EUR × (4000/0.8) = 52.750 COP exactos
    expect(computeRevaluation(account, table)?.targetCop).toBe(52_750);
  });
});

describe('revaluación + reconciliación', () => {
  it('el ajuste sale de computeReconciliation contra el saldo registrado', () => {
    const account = { cachedBalance: 34_051_370, foreignCurrency: 'USD', foreignAmount: 12782 };
    const result = computeRevaluation(account, table);
    const adjustment = computeReconciliation(account.cachedBalance, result!.targetCop);
    expect(adjustment).toEqual({ direction: 'increase', amount: 17_076_630 });
  });

  it('reconciliar en divisa: el COP objetivo sale de convertToCop con la tasa del día', () => {
    // El usuario dice "el saldo real es 13.000 USD" → objetivo 52.000.000 COP.
    expect(convertToCop(13_000, 'USD', table)).toBe(52_000_000);
  });
});

describe('notas de ajuste', () => {
  it('la nota de revaluación incluye moneda y tasa formateada', () => {
    expect(buildRevaluationNote('USD', 3950.4)).toBe('Revaluación USD (tasa 3.950)');
  });

  it('la nota de reconciliación en divisa incluye moneda y tasa', () => {
    expect(buildForeignReconcileNote('USD', 4000)).toBe('Reconciliación en USD (tasa 4.000)');
  });
});
