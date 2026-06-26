import { describe, expect, it } from 'vitest';
import {
  budgetBackedFilled,
  budgetForCategory,
  effectiveFixedStatus,
  linkedBudgetBackedFixed,
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
});
