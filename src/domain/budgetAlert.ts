// Nivel de alerta de un presupuesto según su consumo (CLAUDE.md §5.9). Lógica PURA: decide si un
// tope está tranquilo, cerca del límite (alcanzó el ratio, p.ej. 80%) o excedido (se pasó del tope).
// Lo usa el aviso emergente que sale APENAS un presupuesto cruza el umbral, una vez por nivel.

export type BudgetAlertLevel = 'none' | 'near' | 'exceeded';

/** Orden de severidad para comparar/deduplicar: none < near < exceeded. */
export function budgetAlertRank(level: BudgetAlertLevel): number {
  return level === 'exceeded' ? 2 : level === 'near' ? 1 : 0;
}

/**
 * Nivel de alerta de un tope: `exceeded` si el gasto superó el tope; `near` si alcanzó (≥) el ratio
 * del tope sin pasarse; `none` si va holgado o el tope no es positivo. `nearRatio` p.ej. 0.8 (80%).
 */
export function budgetAlertLevel(consumed: number, cap: number, nearRatio: number): BudgetAlertLevel {
  if (cap <= 0) return 'none';
  if (consumed > cap) return 'exceeded';
  if (consumed >= nearRatio * cap) return 'near';
  return 'none';
}
