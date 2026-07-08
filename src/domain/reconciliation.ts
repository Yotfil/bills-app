// Reconciliación de cuentas, tarjetas y créditos (CLAUDE.md §5.7). Los saldos/deudas NO se
// editan a mano: el usuario dice "el valor real es X" y se crea un movimiento de AJUSTE por el
// desfase exacto, que lleva el valor registrado al real. Las cuentas en moneda extranjera se
// reconcilian EN SU DIVISA (decisión 2026-07-09): el ajuste vive en la divisa y su COP es la
// conversión del día.
import { foreignToCop } from './currencyConversion';
import { buildForeignReconcileNote } from './foreignLedger';
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
    periodMonth: null,
  };
}

/**
 * Construye el ajuste de reconciliar una cuenta EN SU DIVISA (decisión 2026-07-09): el desfase
 * se calcula en la divisa (`foreignAmount = |Δ|`, con la dirección del signo) y el `amount` COP
 * es su conversión con la tasa del día — clampeado a mínimo 1 peso, porque un Δ de centavos de
 * divisa no puede producir un monto COP de 0 (violaría §11). El movimiento actualiza AMBOS
 * ledgers al aplicarse: `foreignAmount` de la cuenta (foreignDelta) y `cachedBalance` (delta COP).
 * Devuelve null si no hay desfase en la divisa.
 */
export function buildForeignReconciliationAdjustment(
  registeredForeign: number,
  realForeign: number,
  currency: string,
  rateToCop: number,
  options: BuildAdjustmentOptions,
): TransactionDraft | null {
  // Redondeo a centavos: evita "desfases" fantasma por ruido de coma flotante.
  const diff = Math.round((realForeign - registeredForeign) * 100) / 100;
  if (diff === 0) return null;
  const foreignAmount = Math.abs(diff);

  return {
    date: options.date,
    concept: 'Ajuste por reconciliación',
    type: 'adjustment',
    amount: Math.max(1, foreignToCop(foreignAmount, rateToCop)),
    categoryId: options.adjustmentCategoryId,
    source: options.source,
    destination: null,
    adjustmentDirection: diff > 0 ? 'increase' : 'decrease',
    tags: [],
    note: options.note ?? buildForeignReconcileNote(currency, rateToCop),
    fixedMonthlyId: null,
    periodMonth: null,
    foreignCurrency: currency,
    foreignAmount,
  };
}
