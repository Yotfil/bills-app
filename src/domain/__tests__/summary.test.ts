import { describe, it, expect } from 'vitest';
import { monthlySummary } from '../summary';
import { accountRef, cardRef, makeTxn } from './fixtures';

// CLAUDE.md §8.1 — Resumen del mes: Ingresos | Gastos | Flujo. Solo expense cuenta como
// gasto (§5.4); las transferencias/abonos no afectan ingresos ni gastos.

describe('monthlySummary', () => {
  it('suma ingresos y gastos, y calcula el flujo', () => {
    const txns = [
      makeTxn({
        type: 'income',
        amount: 3_000_000,
        source: null,
        destination: accountRef('a'),
        categoryId: null,
      }),
      makeTxn({ type: 'expense', amount: 200_000, categoryId: 'comidas' }),
      makeTxn({ type: 'expense', amount: 300_000, categoryId: 'mercado' }),
    ];
    const summary = monthlySummary(txns);
    expect(summary.income).toBe(3_000_000);
    expect(summary.expense).toBe(500_000);
    expect(summary.flow).toBe(2_500_000);
  });

  it('ignora transferencias y abonos en ingresos y gastos', () => {
    const txns = [
      makeTxn({
        type: 'transfer',
        amount: 100_000,
        source: accountRef('a'),
        destination: accountRef('b'),
        categoryId: null,
      }),
      makeTxn({
        type: 'debt_payment',
        amount: 500_000,
        source: accountRef('a'),
        destination: cardRef('c'),
        categoryId: null,
      }),
    ];
    const summary = monthlySummary(txns);
    expect(summary.income).toBe(0);
    expect(summary.expense).toBe(0);
    expect(summary.flow).toBe(0);
  });

  it('flujo negativo cuando se gasta más de lo que entra', () => {
    const txns = [
      makeTxn({
        type: 'income',
        amount: 100_000,
        source: null,
        destination: accountRef('a'),
        categoryId: null,
      }),
      makeTxn({ type: 'expense', amount: 250_000, categoryId: 'ocio' }),
    ];
    expect(monthlySummary(txns).flow).toBe(-150_000);
  });
});
