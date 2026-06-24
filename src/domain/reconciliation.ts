// Reconciliación de cuentas, tarjetas y créditos (CLAUDE.md §5.7). Los saldos/deudas NO se
// editan a mano: el usuario dice "el valor real es X" y se crea un movimiento de AJUSTE por el
// desfase exacto, que lleva el valor registrado al real.
import type { TransactionDraft } from './types';
import type { ReconciliationResult } from './ReconciliationResult';
import type { BuildAdjustmentOptions } from './BuildAdjustmentOptions';

export type { ReconciliationResult } from './ReconciliationResult';
export type { BuildAdjustmentOptions } from './BuildAdjustmentOptions';

/**
 * Calcula el ajuste necesario para llevar el saldo registrado al saldo real.
 *   real > registrado → 'increase'
 *   real < registrado → 'decrease'
 * Devuelve null si no hay desfase (no se crea movimiento).
 */
export function computeReconciliation(
  registeredBalance: number,
  realBalance: number,
): ReconciliationResult | null {
  const diff = realBalance - registeredBalance;
  if (diff === 0) return null;
  return {
    direction: diff > 0 ? 'increase' : 'decrease',
    amount: Math.abs(diff),
  };
}

/**
 * Construye el movimiento de ajuste de una reconciliación. Usa la categoría de sistema
 * "Ajuste" para NO contaminar los reportes de gasto (§5.7). Devuelve null si no hay desfase.
 */
export function buildReconciliationAdjustment(
  registeredValue: number,
  realValue: number,
  options: BuildAdjustmentOptions,
): TransactionDraft | null {
  const result = computeReconciliation(registeredValue, realValue);
  if (!result) return null;

  return {
    date: options.date,
    concept: 'Ajuste por reconciliación',
    type: 'adjustment',
    amount: result.amount,
    categoryId: options.adjustmentCategoryId,
    source: options.source,
    destination: null,
    adjustmentDirection: result.direction,
    tags: [],
    note: options.note ?? null,
    fixedMonthlyId: null,
  };
}
