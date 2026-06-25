import { describe, it, expect } from 'vitest';
import { monthlyInsights, topCategories } from '../insights';
import { HORMIGA_TAG } from '../types';
import { accountRef, makeTxn } from './fixtures';

// CLAUDE.md §15 — Reportes/insights: tendencias mes a mes, top categorías, hormiga histórico.
// El mes de cada movimiento llega como `monthOf`; en los tests lo guardamos en `note`.
const monthOf = (t: { note: string | null }) => t.note ?? '';
const inMonth = (month: string, partial = {}) => makeTxn({ note: month, ...partial });

describe('monthlyInsights (tendencia mes a mes)', () => {
  it('agrega ingreso, gasto y hormiga por mes, en el orden pedido', () => {
    const txns = [
      inMonth('2026-05', { type: 'expense', amount: 30_000 }),
      inMonth('2026-06', { type: 'expense', amount: 50_000 }),
      inMonth('2026-06', { type: 'expense', amount: 10_000, tags: [HORMIGA_TAG] }),
      inMonth('2026-06', {
        type: 'income',
        amount: 200_000,
        categoryId: null,
        source: null,
        destination: accountRef('acc-1'),
      }),
    ];
    const result = monthlyInsights(txns, ['2026-05', '2026-06'], monthOf);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ month: '2026-05', income: 0, expense: 30_000, hormiga: 0 });
    expect(result[1]).toEqual({ month: '2026-06', income: 200_000, expense: 60_000, hormiga: 10_000 });
  });

  it('los meses sin movimientos quedan en cero (serie completa, sin huecos)', () => {
    const result = monthlyInsights([inMonth('2026-06', { amount: 5_000 })], ['2026-04', '2026-05', '2026-06'], monthOf);
    expect(result.map((r) => r.expense)).toEqual([0, 0, 5_000]);
  });

  it('ignora movimientos fuera de la ventana pedida', () => {
    const txns = [inMonth('2026-01', { amount: 99_000 }), inMonth('2026-06', { amount: 5_000 })];
    const result = monthlyInsights(txns, ['2026-06'], monthOf);
    expect(result).toEqual([{ month: '2026-06', income: 0, expense: 5_000, hormiga: 0 }]);
  });

  it('excluye transferencias y abonos del gasto (regla de oro §5.4)', () => {
    const txns = [
      inMonth('2026-06', { type: 'expense', amount: 20_000 }),
      inMonth('2026-06', { type: 'transfer', amount: 100_000, categoryId: null, destination: accountRef('acc-2') }),
      inMonth('2026-06', { type: 'debt_payment', amount: 80_000, categoryId: null, destination: { kind: 'card', id: 'c1' } }),
    ];
    expect(monthlyInsights(txns, ['2026-06'], monthOf)[0]!.expense).toBe(20_000);
  });
});

describe('topCategories', () => {
  it('ordena las categorías por gasto descendente', () => {
    const txns = [
      makeTxn({ categoryId: 'comidas', amount: 30_000 }),
      makeTxn({ categoryId: 'transporte', amount: 80_000 }),
      makeTxn({ categoryId: 'comidas', amount: 10_000 }),
      makeTxn({ categoryId: 'ocio', amount: 5_000 }),
    ];
    expect(topCategories(txns)).toEqual([
      { categoryId: 'transporte', total: 80_000 },
      { categoryId: 'comidas', total: 40_000 },
      { categoryId: 'ocio', total: 5_000 },
    ]);
  });

  it('respeta el límite de N categorías', () => {
    const txns = [
      makeTxn({ categoryId: 'a', amount: 10 }),
      makeTxn({ categoryId: 'b', amount: 20 }),
      makeTxn({ categoryId: 'c', amount: 30 }),
    ];
    expect(topCategories(txns, 2)).toEqual([
      { categoryId: 'c', total: 30 },
      { categoryId: 'b', total: 20 },
    ]);
  });
});
