// Reconciliación de cuentas (CLAUDE.md §5.7). Los saldos NO se editan a mano: el usuario
// dice "el saldo real es X" y se crea un movimiento de AJUSTE por el desfase exacto.
import type { Timestamp } from 'firebase/firestore';
import type { AdjustmentDirection, EntityRef, TransactionDraft } from './types';

export interface ReconciliationResult {
  direction: AdjustmentDirection;
  amount: number; // siempre positivo (el desfase); la dirección decide si suma o resta
}

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

export interface BuildAdjustmentOptions {
  account: EntityRef; // cuenta a reconciliar (origen del ajuste)
  adjustmentCategoryId: string; // id de la categoría de sistema "Ajuste / Reconciliación"
  date: Timestamp;
  note?: string | null;
}

/**
 * Construye el movimiento de ajuste de una reconciliación. Usa la categoría de sistema
 * "Ajuste" para NO contaminar los reportes de gasto (§5.7). Devuelve null si no hay desfase.
 */
export function buildReconciliationAdjustment(
  registeredBalance: number,
  realBalance: number,
  options: BuildAdjustmentOptions,
): TransactionDraft | null {
  const result = computeReconciliation(registeredBalance, realBalance);
  if (!result) return null;

  return {
    date: options.date,
    concept: 'Ajuste por reconciliación',
    type: 'adjustment',
    amount: result.amount,
    categoryId: options.adjustmentCategoryId,
    source: options.account,
    destination: null,
    adjustmentDirection: result.direction,
    tags: [],
    note: options.note ?? null,
    fixedMonthlyId: null,
  };
}
