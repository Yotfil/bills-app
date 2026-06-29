import { describe, it, expect } from 'vitest';
import { isBudgetItem, linkedBudgetItems } from '../budgetBackedFixed';
import { fixedTotals, buildTransactionFromFixed } from '../fixed';
import { accountRef, makeFixed, STUB_TS } from './fixtures';
import type { FixedObligationMonthly } from '../types';

// Fijos que CONSUMEN de un presupuesto (§5.9 ext.): ítems del checklist de una bolsa. No suman
// aparte a los totales; cuelgan del presupuesto de checklist de su categoría.
const MAMA = 'cat-mama';

describe('isBudgetItem', () => {
  it('true solo si consumesBudget está activo', () => {
    expect(isBudgetItem(makeFixed({ consumesBudget: true }))).toBe(true);
    expect(isBudgetItem(makeFixed({ consumesBudget: false }))).toBe(false);
    expect(isBudgetItem(makeFixed())).toBe(false); // campo ausente = false
  });
});

describe('linkedBudgetItems', () => {
  const agua = makeFixed({ id: 'agua', consumesBudget: true, categoryId: MAMA, budgetedAmount: 30_000 });
  const luz = makeFixed({ id: 'luz', consumesBudget: true, categoryId: MAMA, budgetedAmount: 60_000 });
  const otro = makeFixed({ id: 'otro', consumesBudget: true, categoryId: 'cat-ocio' });
  const normal = makeFixed({ id: 'n', categoryId: MAMA });
  const fijos = [agua, luz, otro, normal];

  it('devuelve los ítems que consumen el presupuesto de esa categoría', () => {
    const items = linkedBudgetItems(MAMA, fijos);
    expect(items.map((i) => i.id).sort()).toEqual(['agua', 'luz']);
  });

  it('excluye los de otra categoría y los fijos normales (no consumen presupuesto)', () => {
    const items = linkedBudgetItems(MAMA, fijos);
    expect(items.find((i) => i.id === 'otro')).toBeUndefined();
    expect(items.find((i) => i.id === 'n')).toBeUndefined();
  });

  it('vacío si la categoría no tiene ítems ligados', () => {
    expect(linkedBudgetItems('cat-vacia', fijos)).toEqual([]);
  });
});

describe('totales: los ítems anidados (consumen una bolsa) NO se suman aparte', () => {
  // Réplica de la exclusión que hace FijosScreen: un ítem que consume el presupuesto de una categoría
  // de checklist no entra a los totales de Gastos (la bolsa/presupuesto ya lo representa).
  const cuota = makeFixed({ id: 'env', categoryId: MAMA, budgetedAmount: 650_000, status: 'pending' });
  const agua = makeFixed({ id: 'agua', consumesBudget: true, categoryId: MAMA, budgetedAmount: 30_000, status: 'pending' });
  const fijos = [cuota, agua];

  // Las categorías con presupuesto de checklist vienen de los Budgets (aquí, simulado).
  const checklistCategoryIds = new Set([MAMA]);
  const isNested = (f: FixedObligationMonthly) =>
    isBudgetItem(f) && checklistCategoryIds.has(f.categoryId);

  it('el total cuenta la cuota (650k) y excluye el servicio anidado', () => {
    const totals = fixedTotals(fijos.filter((f) => !isNested(f)));
    expect(totals.pendingAmount).toBe(650_000); // 650k, NO 680k
    expect(totals.counts.total).toBe(1);
  });
});

describe('pago de un fijo: pertenece al mes del fijo (periodMonth)', () => {
  it('el movimiento generado lleva periodMonth = el mes del fijo, no el de la fecha de pago', () => {
    // Fijo de Julio pagado con fecha de hoy (STUB): el presupuesto debe ser el de Julio.
    const fixed = makeFixed({ month: '2026-07', name: 'Agua mamá', categoryId: MAMA });
    const draft = buildTransactionFromFixed(fixed, {
      amount: 30_000,
      date: STUB_TS,
      paymentMethod: accountRef('acc-1'),
      debtTarget: null,
    });
    expect(draft.periodMonth).toBe('2026-07');
  });
});
