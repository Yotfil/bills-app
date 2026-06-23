import { describe, it, expect } from 'vitest';
import { budgetStatus, spendByCategory, totalHormiga, totalSpend } from '../reports';
import { accountRef, cardRef, loanRef, makeTxn } from './fixtures';
import { HORMIGA_TAG } from '../types';

// CLAUDE.md §12.1 — Reportes de gasto, hormiga y presupuestos. Regla de oro (§5.4):
// transfer, debt_payment y adjustment NUNCA cuentan como gasto.

describe('Reportes de gasto', () => {
  const mixed = [
    makeTxn({ type: 'expense', amount: 30_000, categoryId: 'comidas' }),
    makeTxn({ type: 'expense', amount: 20_000, categoryId: 'comidas' }),
    makeTxn({ type: 'expense', amount: 100_000, categoryId: 'mercado' }),
    makeTxn({
      type: 'income',
      amount: 500_000,
      source: null,
      destination: accountRef('a'),
      categoryId: null,
    }),
    makeTxn({
      type: 'transfer',
      amount: 200_000,
      source: accountRef('a'),
      destination: accountRef('b'),
      categoryId: null,
    }),
    makeTxn({
      type: 'debt_payment',
      amount: 300_000,
      source: accountRef('a'),
      destination: cardRef('c'),
      categoryId: null,
    }),
    makeTxn({
      type: 'adjustment',
      amount: 10_000,
      source: accountRef('a'),
      categoryId: 'ajuste',
      adjustmentDirection: 'increase',
    }),
  ];

  it('el total de gasto excluye transfer, debt_payment, adjustment e income', () => {
    expect(totalSpend(mixed)).toBe(150_000); // 30k + 20k + 100k
  });

  it('agrupa el gasto por categoría (solo expense)', () => {
    expect(spendByCategory(mixed)).toEqual({ comidas: 50_000, mercado: 100_000 });
  });

  it('un debt_payment a crédito tampoco cuenta como gasto', () => {
    const txns = [
      makeTxn({
        type: 'debt_payment',
        amount: 1_000_000,
        source: accountRef('a'),
        destination: loanRef('l'),
        categoryId: null,
      }),
    ];
    expect(totalSpend(txns)).toBe(0);
  });
});

describe('Etiqueta hormiga (§5.8)', () => {
  it('suma los gastos con tag hormiga cruzando categorías; ignora los que no la tienen', () => {
    const txns = [
      makeTxn({ type: 'expense', amount: 8_000, categoryId: 'comidas', tags: [HORMIGA_TAG] }),
      makeTxn({ type: 'expense', amount: 5_000, categoryId: 'transporte', tags: [HORMIGA_TAG] }),
      makeTxn({ type: 'expense', amount: 100_000, categoryId: 'mercado', tags: [] }),
    ];
    expect(totalHormiga(txns)).toBe(13_000);
  });
});

describe('Presupuestos por categoría (§5.9)', () => {
  it('consumo = Σ gastos de la categoría; restante = tope − consumo', () => {
    const txns = [
      makeTxn({ type: 'expense', amount: 120_000, categoryId: 'ocio' }),
      makeTxn({ type: 'expense', amount: 150_000, categoryId: 'ocio' }),
      makeTxn({ type: 'expense', amount: 90_000, categoryId: 'comidas' }),
    ];
    const status = budgetStatus(txns, 'ocio', 400_000);
    expect(status.consumed).toBe(270_000);
    expect(status.remaining).toBe(130_000);
    expect(status.exceeded).toBe(false);
  });

  it('marca exceeded cuando se supera el tope', () => {
    const txns = [makeTxn({ type: 'expense', amount: 450_000, categoryId: 'ocio' })];
    expect(budgetStatus(txns, 'ocio', 400_000).exceeded).toBe(true);
  });
});
