import { describe, expect, it } from 'vitest';
import { budgetAlertLevel, budgetAlertRank, computePendingBudgetAlerts } from '../budgetAlert';
import { makeBudget } from './fixtures';

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

// Avisos pendientes de confirmar (§5.9): cruza presupuestos de checklist con lo ya confirmado.
describe('computePendingBudgetAlerts', () => {
  const base = {
    month: '2026-07',
    nearRatio: 0.8,
    categoryName: () => 'Ocio',
  };

  it('avisa solo los presupuestos de checklist que cruzaron un umbral', () => {
    const budgets = [
      makeBudget({ id: 'b1', inChecklist: true, monthlyLimit: 1000 }), // 85% → near
      makeBudget({ id: 'b2', inChecklist: true, monthlyLimit: 10_000 }), // holgado → nada
      makeBudget({ id: 'b3', inChecklist: false, monthlyLimit: 100 }), // no vigilado
      makeBudget({ id: 'b4', inChecklist: true, archived: true, monthlyLimit: 100 }), // archivado
    ];
    const pending = computePendingBudgetAlerts({
      ...base,
      budgets,
      consumedForCategory: () => 850,
      acknowledged: {},
    });
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ key: '2026-07:b1', level: 'near', consumed: 850, cap: 1000 });
  });

  it('no repite un nivel ya confirmado, pero sí avisa si sube de near a exceeded', () => {
    const budgets = [makeBudget({ id: 'b1', inChecklist: true, monthlyLimit: 1000 })];
    // Ya se confirmó 'near': con 85% no vuelve a avisar.
    expect(
      computePendingBudgetAlerts({
        ...base,
        budgets,
        consumedForCategory: () => 850,
        acknowledged: { '2026-07:b1': 'near' },
      }),
    ).toHaveLength(0);
    // Pero al EXCEDERSE el nivel sube y el aviso sale de nuevo.
    const exceeded = computePendingBudgetAlerts({
      ...base,
      budgets,
      consumedForCategory: () => 1200,
      acknowledged: { '2026-07:b1': 'near' },
    });
    expect(exceeded).toHaveLength(1);
    expect(exceeded[0]?.level).toBe('exceeded');
  });
});
