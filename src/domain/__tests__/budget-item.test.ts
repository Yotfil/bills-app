import { describe, it, expect } from 'vitest';
import { isBudgetItem, linkedBudgetItems } from '../budgetBackedFixed';
import { fixedTotals, buildTransactionFromFixed } from '../fixed';
import { accountRef, makeFixed, STUB_TS } from './fixtures';
import type { FixedObligationMonthly } from '../types';

// Fijos que CONSUMEN de un presupuesto (§5.9 ext.): ítems del checklist de una bolsa. No suman
// aparte a los totales; cuelgan de su presupuesto respaldado.
const MAMA = 'cat-mama';

describe('isBudgetItem', () => {
  it('true solo si consumesBudget está activo', () => {
    expect(isBudgetItem(makeFixed({ consumesBudget: true }))).toBe(true);
    expect(isBudgetItem(makeFixed({ consumesBudget: false }))).toBe(false);
    expect(isBudgetItem(makeFixed())).toBe(false); // campo ausente = false
  });
});

describe('linkedBudgetItems', () => {
  const cuota = makeFixed({ id: 'env', budgetBacked: true, categoryId: MAMA, budgetedAmount: 650_000 });
  const agua = makeFixed({ id: 'agua', consumesBudget: true, categoryId: MAMA, budgetedAmount: 30_000 });
  const luz = makeFixed({ id: 'luz', consumesBudget: true, categoryId: MAMA, budgetedAmount: 60_000 });
  const otro = makeFixed({ id: 'otro', consumesBudget: true, categoryId: 'cat-ocio' });
  const normal = makeFixed({ id: 'n', categoryId: MAMA });
  const fijos = [cuota, agua, luz, otro, normal];

  it('devuelve los ítems que consumen el presupuesto de esa categoría', () => {
    const items = linkedBudgetItems(MAMA, fijos);
    expect(items.map((i) => i.id).sort()).toEqual(['agua', 'luz']);
  });

  it('excluye el respaldado (que ES la bolsa), los de otra categoría y los normales', () => {
    const items = linkedBudgetItems(MAMA, fijos);
    expect(items.find((i) => i.id === 'env')).toBeUndefined();
    expect(items.find((i) => i.id === 'otro')).toBeUndefined();
    expect(items.find((i) => i.id === 'n')).toBeUndefined();
  });

  it('vacío si la categoría no tiene ítems ligados', () => {
    expect(linkedBudgetItems('cat-vacia', fijos)).toEqual([]);
  });
});

describe('totales: los ítems ligados NO se suman aparte', () => {
  // Réplica de la exclusión que hace FijosScreen: un ítem que consume una bolsa existente no entra
  // a los totales (la cuota/presupuesto ya lo representa, evita duplicar).
  const cuota = makeFixed({ id: 'env', budgetBacked: true, categoryId: MAMA, budgetedAmount: 650_000, status: 'pending' });
  const agua = makeFixed({ id: 'agua', consumesBudget: true, categoryId: MAMA, budgetedAmount: 30_000, status: 'pending' });
  const fijos = [cuota, agua];

  const envelopeCategoryIds = new Set(fijos.filter((f) => f.budgetBacked).map((f) => f.categoryId));
  const isNested = (f: FixedObligationMonthly) =>
    isBudgetItem(f) && !f.budgetBacked && envelopeCategoryIds.has(f.categoryId);

  it('el total cuenta el presupuesto (650k) una vez y excluye el servicio ligado', () => {
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
