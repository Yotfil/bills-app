import { describe, expect, it } from 'vitest';
import { EMPTY_FIXED_FILTER, isFixedFilterActive, matchesFixedFilter } from '../fixedFilters';
import { accountRef, cardRef, makeFixed } from './fixtures';

// Filtros de la pestaña Gastos de Fijos (§8.3).
describe('fixedFilters', () => {
  it('el filtro vacío no oculta nada', () => {
    expect(isFixedFilterActive(EMPTY_FIXED_FILTER)).toBe(false);
    expect(matchesFixedFilter(makeFixed({}), EMPTY_FIXED_FILTER)).toBe(true);
  });

  it('filtra por estado', () => {
    const f = makeFixed({ status: 'paid' });
    expect(matchesFixedFilter(f, { ...EMPTY_FIXED_FILTER, status: 'paid' })).toBe(true);
    expect(matchesFixedFilter(f, { ...EMPTY_FIXED_FILTER, status: 'pending' })).toBe(false);
  });

  it('filtra por categoría', () => {
    const f = makeFixed({ categoryId: 'cat-familia' });
    expect(matchesFixedFilter(f, { ...EMPTY_FIXED_FILTER, categoryId: 'cat-familia' })).toBe(true);
    expect(matchesFixedFilter(f, { ...EMPTY_FIXED_FILTER, categoryId: 'cat-ocio' })).toBe(false);
  });

  it('filtra por medio de pago (kind:id)', () => {
    const f = makeFixed({ paymentMethod: cardRef('tc-1') });
    expect(matchesFixedFilter(f, { ...EMPTY_FIXED_FILTER, methodKey: 'card:tc-1' })).toBe(true);
    expect(matchesFixedFilter(f, { ...EMPTY_FIXED_FILTER, methodKey: 'account:acc-1' })).toBe(false);
  });

  it('filtra "solo con cobro automático"', () => {
    expect(matchesFixedFilter(makeFixed({ autoPayDay: 5 }), { ...EMPTY_FIXED_FILTER, autoOnly: true })).toBe(
      true,
    );
    expect(matchesFixedFilter(makeFixed({ autoPayDay: null }), { ...EMPTY_FIXED_FILTER, autoOnly: true })).toBe(
      false,
    );
  });

  it('isFixedFilterActive detecta cualquier dimensión activa', () => {
    expect(isFixedFilterActive({ ...EMPTY_FIXED_FILTER, status: 'paid' })).toBe(true);
    expect(isFixedFilterActive({ ...EMPTY_FIXED_FILTER, autoOnly: true })).toBe(true);
    expect(isFixedFilterActive({ ...EMPTY_FIXED_FILTER, methodKey: 'account:acc-1' })).toBe(true);
  });

  it('accountRef/cardRef producen la misma clave que el filtro', () => {
    expect(`${accountRef('x').kind}:${accountRef('x').id}`).toBe('account:x');
  });
});
