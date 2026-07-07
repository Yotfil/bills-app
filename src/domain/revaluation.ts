// Revaluación de cuentas en moneda extranjera (p.ej. Global66 en USD). Para estas cuentas la
// FUENTE DE VERDAD es el monto en divisa (foreignAmount): el saldo COP es solo su reflejo con
// la tasa del día. Como los saldos nunca se editan a mano (§2), la realineación se hace con un
// movimiento de AJUSTE (§5.7), que crea el servicio de datos; aquí vive solo el cálculo puro.
import { copPerUnit, foreignToCop } from './currencyConversion';
import { formatCopPlain } from '../lib/currency';
import type { Account } from './types';
import type { ExchangeRateTable } from './ExchangeRateTable';
import type { RevaluationResult } from './RevaluationResult';

export type { RevaluationResult } from './RevaluationResult';

type RevaluationAccount = Pick<Account, 'cachedBalance' | 'foreignCurrency' | 'foreignAmount'>;

/**
 * Calcula el saldo COP objetivo de una cuenta en divisa con la tasa del día. Devuelve null si
 * no aplica: cuenta sin divisa, tabla sin tasa para esa moneda, o saldo ya alineado
 * (idempotencia: revaluar dos veces el mismo día no crea ajustes de más).
 */
export function computeRevaluation(
  account: RevaluationAccount,
  table: ExchangeRateTable,
): RevaluationResult | null {
  if (!account.foreignCurrency || account.foreignAmount == null) return null;
  const rateToCop = copPerUnit(table, account.foreignCurrency);
  if (rateToCop === null) return null;
  const targetCop = foreignToCop(account.foreignAmount, rateToCop);
  if (targetCop === account.cachedBalance) return null;
  return { targetCop, rateToCop };
}

/** Nota del ajuste de revaluación, p.ej. "Revaluación USD (tasa 3.950)". */
export function buildRevaluationNote(currency: string, rateToCop: number): string {
  return `Revaluación ${currency} (tasa ${formatCopPlain(rateToCop)})`;
}

// (buildForeignReconcileNote y el delta de divisa por movimiento viven en foreignLedger.ts.)
