import { describe, expect, it } from 'vitest';
import {
  boostedOverride,
  budgetCapForMonth,
  budgetChecklistStatus,
  budgetChecklistTotals,
  budgetFilled,
  budgetForCategory,
  exceededChecklistBudgets,
  nearLimitChecklistBudgets,
} from '../checklistBudgets';
import { makeBudget } from './fixtures';

// Presupuestos en el checklist de Fijos (CLAUDE.md §5.9, Opción C).
describe('checklistBudgets', () => {
  it('budgetForCategory devuelve el presupuesto activo de la categoría, o null', () => {
    const budgets = [
      makeBudget({ id: 'b1', categoryId: 'cat-ocio' }),
      makeBudget({ id: 'b2', categoryId: 'cat-comidas', archived: true }),
    ];
    expect(budgetForCategory('cat-ocio', budgets)?.id).toBe('b1');
    expect(budgetForCategory('cat-comidas', budgets)).toBeNull(); // archivado
    expect(budgetForCategory('cat-x', budgets)).toBeNull();
  });

  it('budgetFilled: lleno solo cuando consumido alcanza el tope (tope > 0)', () => {
    expect(budgetFilled(400_000, 400_000)).toBe(true);
    expect(budgetFilled(450_000, 400_000)).toBe(true);
    expect(budgetFilled(399_999, 400_000)).toBe(false);
    expect(budgetFilled(0, 0)).toBe(false);
  });

  it('exceededChecklistBudgets: lista solo presupuestos inChecklist con gasto > tope, con el sobrepaso', () => {
    const budgets = [
      makeBudget({ id: 'ok', categoryId: 'cat-ocio', monthlyLimit: 400, inChecklist: true }),
      makeBudget({ id: 'over', categoryId: 'cat-comidas', monthlyLimit: 400, inChecklist: true }),
      makeBudget({ id: 'nock', categoryId: 'cat-x', monthlyLimit: 100, inChecklist: false }),
    ];
    const consumedOf = (cat: string) =>
      cat === 'cat-comidas' ? 450 : cat === 'cat-ocio' ? 200 : 999;
    const exceeded = exceededChecklistBudgets(budgets, '2026-06', consumedOf);
    expect(exceeded).toHaveLength(1);
    expect(exceeded[0]?.budget.id).toBe('over');
    expect(exceeded[0]?.overspend).toBe(50);
  });

  it('boostedOverride: suma/resta el aumento al tope; limpia (null) si vuelve a la base', () => {
    expect(boostedOverride(650, 650, 200, 1)).toBe(850); // aplicar sobre la base
    expect(boostedOverride(850, 650, 100, 1)).toBe(950); // aplicar sobre un override existente
    expect(boostedOverride(950, 650, 100, -1)).toBe(850); // revertir parcial
    expect(boostedOverride(850, 650, 200, -1)).toBeNull(); // revertir hasta la base → limpia
  });

  it('budgetCapForMonth: usa el override del mes (presupuesto normal); si no, la base; meses independientes', () => {
    const budget = makeBudget({ monthlyLimit: 650_000, monthlyOverrides: { '2026-06': 900_000 } });
    expect(budgetCapForMonth(budget, '2026-06')).toBe(900_000); // override del mes
    expect(budgetCapForMonth(budget, '2026-07')).toBe(650_000); // mes sin override → base
    expect(budgetCapForMonth(makeBudget({ monthlyLimit: 400_000 }), '2026-06')).toBe(400_000);
  });

  it('el override del mes del Budget manda en exceeded/nearLimit', () => {
    // Base 400, override 900 en 2026-06: con gasto 450 NO se excede ni está cerca.
    const b = makeBudget({
      categoryId: 'cat-ocio',
      monthlyLimit: 400,
      monthlyOverrides: { '2026-06': 900 },
      inChecklist: true,
    });
    expect(exceededChecklistBudgets([b], '2026-06', () => 450)).toHaveLength(0);
    expect(nearLimitChecklistBudgets([b], '2026-06', () => 450, 0.8)).toHaveLength(0); // 450/900 = 50%
  });

  it('budgetChecklistStatus: deriva lleno/pagado del consumo + tope, y respeta "pagado a mano"', () => {
    const b = makeBudget({ categoryId: 'cat-ocio', monthlyLimit: 400, inChecklist: true });
    expect(budgetChecklistStatus(b, '2026-06', 200)).toBe('pending'); // en curso
    expect(budgetChecklistStatus(b, '2026-06', 450)).toBe('paid'); // lleno por consumo
    const paid = makeBudget({
      categoryId: 'cat-ocio',
      monthlyLimit: 400,
      inChecklist: true,
      manualPaidMonths: { '2026-06': true },
    });
    expect(budgetChecklistStatus(paid, '2026-06', 0)).toBe('paid'); // pagado a mano, sin consumo
  });

  it('budgetChecklistTotals: reparto GRADUAL (gastado→Pagado, resto→Por destinar); ignora no-checklist', () => {
    const budgets = [
      makeBudget({ id: 'a', categoryId: 'cat-a', monthlyLimit: 400, inChecklist: true }), // parcial
      makeBudget({ id: 'b', categoryId: 'cat-b', monthlyLimit: 600, inChecklist: true }), // lleno
      makeBudget({ id: 'c', categoryId: 'cat-c', monthlyLimit: 100, inChecklist: false }), // ignorado
    ];
    // cat-a: cap 400, gastado 100 → Pagado 100, Por destinar 300 (gradual, aún "en curso").
    // cat-b: cap 600, gastado 600 → lleno → Pagado 600, Por destinar 0.
    const consumedOf = (cat: string) => (cat === 'cat-b' ? 600 : cat === 'cat-a' ? 100 : 0);
    const t = budgetChecklistTotals(budgets, '2026-06', consumedOf);
    expect(t.pendingAmount).toBe(300);
    expect(t.paidAmount).toBe(700); // 100 (parcial) + 600 (lleno)
    expect(t.pendingCount).toBe(1); // cat-a sigue "en curso"
    expect(t.paidCount).toBe(1); // cat-b lleno
  });

  it('nearLimitChecklistBudgets: lista los que pasan el ratio sin exceder (excluye los ya excedidos)', () => {
    const budgets = [
      makeBudget({ id: 'low', categoryId: 'cat-a', monthlyLimit: 400, inChecklist: true }), // 50%
      makeBudget({ id: 'near', categoryId: 'cat-b', monthlyLimit: 400, inChecklist: true }), // 90%
      makeBudget({ id: 'over', categoryId: 'cat-c', monthlyLimit: 400, inChecklist: true }), // 112%
    ];
    const consumedOf = (cat: string) => (cat === 'cat-a' ? 200 : cat === 'cat-b' ? 360 : 450);
    const near = nearLimitChecklistBudgets(budgets, '2026-06', consumedOf, 0.8);
    expect(near).toHaveLength(1);
    expect(near[0]?.budget.id).toBe('near'); // 'low' no llega al 80%, 'over' ya se pasó
    expect(near[0]?.remaining).toBe(40);
  });
});
