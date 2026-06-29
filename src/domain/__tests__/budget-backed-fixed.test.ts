import { describe, expect, it } from 'vitest';
import {
  budgetBackedAmount,
  budgetBackedFilled,
  budgetBackedTotalAmount,
  budgetForCategory,
  effectiveFixedStatus,
  exceededBudgetBacked,
  fixedCap,
  linkedBudgetBackedFixed,
  nearLimitBudgetBacked,
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

  it('exceededBudgetBacked: lista solo respaldados con gasto > tope, con el sobrepaso', () => {
    const monthlies = [
      makeFixed({ id: 'ok', budgetBacked: true, categoryId: 'cat-ocio', budgetedAmount: 400 }),
      makeFixed({ id: 'over', budgetBacked: true, categoryId: 'cat-comidas', budgetedAmount: 400 }),
      makeFixed({ id: 'normal', budgetBacked: false, categoryId: 'cat-x', budgetedAmount: 100 }),
    ];
    const consumedOf = (cat: string) =>
      cat === 'cat-comidas' ? 450 : cat === 'cat-ocio' ? 200 : 999;
    const exceeded = exceededBudgetBacked(monthlies, consumedOf);
    expect(exceeded).toHaveLength(1);
    expect(exceeded[0]?.fixed.id).toBe('over');
    expect(exceeded[0]?.overspend).toBe(50);
  });

  it('fixedCap: usa el override del mes si lo hay; si no, la base (budgetedAmount)', () => {
    expect(fixedCap(makeFixed({ budgetedAmount: 650_000 }))).toBe(650_000); // sin override
    expect(fixedCap(makeFixed({ budgetedAmount: 650_000, capOverride: null }))).toBe(650_000);
    expect(fixedCap(makeFixed({ budgetedAmount: 650_000, capOverride: 900_000 }))).toBe(900_000);
    expect(fixedCap(makeFixed({ budgetedAmount: 650_000, capOverride: 0 }))).toBe(0); // override explícito
  });

  it('el override del mes manda sobre la base en exceeded/nearLimit/budgetBackedAmount', () => {
    // Base 400, override 900: con gasto 450 NO se excede (tope efectivo 900), a diferencia de la base.
    const overridden = makeFixed({
      budgetBacked: true,
      categoryId: 'cat-ocio',
      budgetedAmount: 400,
      capOverride: 900,
    });
    expect(exceededBudgetBacked([overridden], () => 450)).toHaveLength(0);
    expect(nearLimitBudgetBacked([overridden], () => 450, 0.8)).toHaveLength(0); // 450/900 = 50%
    // En curso aporta el tope efectivo (override), no la base.
    expect(budgetBackedAmount(overridden, 450)).toBe(900);
  });

  it('nearLimitBudgetBacked: lista los que pasan el ratio sin exceder (excluye los ya excedidos)', () => {
    const monthlies = [
      makeFixed({ id: 'low', budgetBacked: true, categoryId: 'cat-a', budgetedAmount: 400 }), // 50%
      makeFixed({ id: 'near', budgetBacked: true, categoryId: 'cat-b', budgetedAmount: 400 }), // 90%
      makeFixed({ id: 'over', budgetBacked: true, categoryId: 'cat-c', budgetedAmount: 400 }), // 112%
    ];
    const consumedOf = (cat: string) =>
      cat === 'cat-a' ? 200 : cat === 'cat-b' ? 360 : 450;
    const near = nearLimitBudgetBacked(monthlies, consumedOf, 0.8);
    expect(near).toHaveLength(1);
    expect(near[0]?.fixed.id).toBe('near'); // 'low' no llega al 80%, 'over' ya se pasó
    expect(near[0]?.remaining).toBe(40);
  });
});
