import { describe, expect, it } from 'vitest';
import { budgetAlertLevel, budgetAlertRank } from '../budgetAlert';

// Nivel de alerta de un presupuesto (CLAUDE.md §5.9).
describe('budgetAlertLevel', () => {
  it('none por debajo del ratio; near al alcanzar el ratio; exceeded al pasarse', () => {
    expect(budgetAlertLevel(700, 1000, 0.8)).toBe('none'); // 70%
    expect(budgetAlertLevel(800, 1000, 0.8)).toBe('near'); // 80% exacto
    expect(budgetAlertLevel(950, 1000, 0.8)).toBe('near'); // 95%, aún sin pasarse
    expect(budgetAlertLevel(1000, 1000, 0.8)).toBe('near'); // tope exacto = alcanzado, no excedido
    expect(budgetAlertLevel(1001, 1000, 0.8)).toBe('exceeded'); // se pasó
    expect(budgetAlertLevel(500, 0, 0.8)).toBe('none'); // tope no positivo
  });

  it('budgetAlertRank ordena none < near < exceeded', () => {
    expect(budgetAlertRank('none')).toBeLessThan(budgetAlertRank('near'));
    expect(budgetAlertRank('near')).toBeLessThan(budgetAlertRank('exceeded'));
  });
});
