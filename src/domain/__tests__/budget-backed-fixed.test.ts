import { describe, expect, it } from 'vitest';
import {
  boostedOverride,
  budgetBackedFilled,
  budgetBackedTotalAmount,
  budgetCapForMonth,
  budgetChecklistAmount,
  budgetChecklistStatus,
  budgetChecklistTotals,
  budgetForCategory,
  effectiveFixedStatus,
  exceededChecklistBudgets,
  linkedBudgetBackedFixed,
  nearLimitChecklistBudgets,
} from '../budgetBackedFixed';
import { fixedTotals } from '../fixed';
import { makeBudget, makeFixed } from './fixtures';

// Fijos respaldados por presupuesto (CLAUDE.md §5.9).
describe('budgetBackedFixed', () => {
  it('budgetForCategory devuelve el presupuesto activo de la categoría, o null', () => {
    const budgets = [
      makeBudget({ id: 'b1', categoryId: 'cat-ocio' }),
      makeBudget({ id: 'b2', categoryId: 'cat-comidas', archived: true }),
    ];
    expect(budgetForCategory('cat-ocio', budgets)?.id).toBe('b1');
    expect(budgetForCategory('cat-comidas', budgets)).toBeNull(); // archivado
    expect(budgetForCategory('cat-x', budgets)).toBeNull();
  });

  it('linkedBudgetBackedFixed: encuentra el fijo respaldado de la categoría (tope por mes = M)', () => {
    const monthlies = [
      makeFixed({ id: 'normal', categoryId: 'cat-ocio', budgetBacked: false }),
      makeFixed({ id: 'backed', categoryId: 'cat-ocio', budgetBacked: true, budgetedAmount: 400 }),
    ];
    expect(linkedBudgetBackedFixed('cat-ocio', monthlies)?.id).toBe('backed');
    expect(linkedBudgetBackedFixed('cat-comidas', monthlies)).toBeNull();
  });

  it('budgetBackedFilled: lleno solo cuando consumido alcanza el tope (tope > 0)', () => {
    expect(budgetBackedFilled(400_000, 400_000)).toBe(true);
    expect(budgetBackedFilled(450_000, 400_000)).toBe(true);
    expect(budgetBackedFilled(399_999, 400_000)).toBe(false);
    expect(budgetBackedFilled(0, 0)).toBe(false);
  });

  it('effectiveFixedStatus: respaldado deriva pending/paid del consumo; normal conserva su status', () => {
    const backed = makeFixed({ budgetBacked: true, categoryId: 'cat-ocio', status: 'pending' });
    const normal = makeFixed({ budgetBacked: false, status: 'allocated' });
    const fullOcio = (cat: string) => cat === 'cat-ocio';
    expect(effectiveFixedStatus(backed, fullOcio)).toBe('paid');
    expect(effectiveFixedStatus(backed, () => false)).toBe('pending');
    expect(effectiveFixedStatus(normal, () => true)).toBe('allocated'); // ignora el resolver
  });

  it('fixedTotals con resolver: el tope del respaldado va a Por destinar y, lleno, a Pagado', () => {
    const fixeds = [
      makeFixed({ id: 'normal', budgetBacked: false, budgetedAmount: 100, status: 'paid' }),
      makeFixed({
        id: 'backed',
        budgetBacked: true,
        categoryId: 'cat-ocio',
        budgetedAmount: 400,
        status: 'pending',
      }),
    ];
    const resolver = (full: boolean) => (f: (typeof fixeds)[number]) =>
      effectiveFixedStatus(f, () => full);

    const enCurso = fixedTotals(fixeds, resolver(false));
    expect(enCurso.pendingAmount).toBe(400); // el tope del respaldado cuenta como por destinar
    expect(enCurso.paidAmount).toBe(100); // solo el fijo normal pagado

    const lleno = fixedTotals(fixeds, resolver(true));
    expect(lleno.pendingAmount).toBe(0);
    expect(lleno.paidAmount).toBe(500); // 100 normal + 400 tope del respaldado lleno
    expect(lleno.allocatedAmount).toBe(0); // un respaldado nunca queda en destinado
  });

  it('budgetBackedTotalAmount: en curso aporta el tope; lleno/excedido aporta el gasto real', () => {
    expect(budgetBackedTotalAmount(300, 400)).toBe(400); // en curso → tope
    expect(budgetBackedTotalAmount(400, 400)).toBe(400); // lleno exacto → tope = gasto
    expect(budgetBackedTotalAmount(450, 400)).toBe(450); // excedido → gasto real (incluye sobrepaso)
  });

  it('fixedTotals con amountOf: Pagado incluye el sobrepaso del respaldado excedido', () => {
    const fixeds = [
      makeFixed({ id: 'b', budgetBacked: true, categoryId: 'cat-ocio', budgetedAmount: 400 }),
    ];
    const statusOf = () => 'paid' as const; // lleno/excedido
    const amountOf = (f: (typeof fixeds)[number]) => budgetBackedTotalAmount(450, f.budgetedAmount);
    expect(fixedTotals(fixeds, statusOf, amountOf).paidAmount).toBe(450);
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

  it('budgetChecklistStatus/Amount: deriva lleno/pagado del consumo + tope, y respeta "pagado a mano"', () => {
    const b = makeBudget({ categoryId: 'cat-ocio', monthlyLimit: 400, inChecklist: true });
    expect(budgetChecklistStatus(b, '2026-06', 200)).toBe('pending'); // en curso
    expect(budgetChecklistAmount(b, '2026-06', 200)).toBe(400); // aporta el tope a Por destinar
    expect(budgetChecklistStatus(b, '2026-06', 450)).toBe('paid'); // lleno por consumo
    expect(budgetChecklistAmount(b, '2026-06', 450)).toBe(450); // aporta el gasto real (sobrepaso)
    const paid = makeBudget({
      categoryId: 'cat-ocio',
      monthlyLimit: 400,
      inChecklist: true,
      manualPaidMonths: { '2026-06': true },
    });
    expect(budgetChecklistStatus(paid, '2026-06', 0)).toBe('paid'); // pagado a mano, sin consumo
    expect(budgetChecklistAmount(paid, '2026-06', 0)).toBe(400); // aporta el tope a Pagado
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
    const consumedOf = (cat: string) =>
      cat === 'cat-a' ? 200 : cat === 'cat-b' ? 360 : 450;
    const near = nearLimitChecklistBudgets(budgets, '2026-06', consumedOf, 0.8);
    expect(near).toHaveLength(1);
    expect(near[0]?.budget.id).toBe('near'); // 'low' no llega al 80%, 'over' ya se pasó
    expect(near[0]?.remaining).toBe(40);
  });
});
