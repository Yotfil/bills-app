// Nivel de alerta de un presupuesto según su consumo (CLAUDE.md §5.9). Lógica PURA: decide si un
// tope está tranquilo, cerca del límite (alcanzó el ratio, p.ej. 80%) o excedido (se pasó del tope).
// Lo usa el aviso emergente que sale APENAS un presupuesto cruza el umbral, una vez por nivel.
import { budgetCapForMonth } from './checklistBudgets';
import type { Budget } from './types';
import type { PendingBudgetAlert, PendingBudgetAlertLevel } from './PendingBudgetAlert';

export type { PendingBudgetAlert, PendingBudgetAlertLevel } from './PendingBudgetAlert';

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

/**
 * Avisos de tope pendientes de confirmar (§5.9): recorre los presupuestos vigilados y devuelve los
 * que cruzaron un umbral a un nivel MÁS ALTO que el ya confirmado por el usuario (así cada aviso
 * sale una sola vez por nivel). El consumo y el nombre de categoría llegan como callbacks para no
 * acoplar esta función a las transacciones ni a la UI.
 */
export function computePendingBudgetAlerts(options: {
  budgets: Budget[];
  month: string;
  nearRatio: number;
  consumedForCategory: (categoryId: string) => number;
  /** Nivel ya confirmado por clave `${mes}:${budgetId}` (el store del pop-up). */
  acknowledged: Record<string, PendingBudgetAlertLevel>;
  categoryName: (categoryId: string) => string;
}): PendingBudgetAlert[] {
  const { budgets, month, nearRatio, consumedForCategory, acknowledged, categoryName } = options;
  const pending: PendingBudgetAlert[] = [];
  for (const b of budgets) {
    // Solo los presupuestos "de checklist" se vigilan activamente (§5.9): los demás son tope base
    // pasivo en la Plantilla, no alertan.
    if (b.archived || !b.active || !b.inChecklist) continue;
    // El tope efectivo del mes vive en el `Budget` (§5.9): override del mes o base.
    const cap = budgetCapForMonth(b, month);
    const consumed = consumedForCategory(b.categoryId);
    const level = budgetAlertLevel(consumed, cap, nearRatio);
    if (level === 'none') continue;
    const key = `${month}:${b.id}`;
    if (budgetAlertRank(level) > budgetAlertRank(acknowledged[key] ?? 'none')) {
      pending.push({ key, level, categoryName: categoryName(b.categoryId), consumed, cap });
    }
  }
  return pending;
}
