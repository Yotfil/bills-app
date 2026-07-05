// Revaluación automática de cuentas en divisa (decisión 2026-07-05): el monto en divisa
// (foreignAmount) es la fuente de verdad y el saldo COP se realinea con la tasa del día
// creando un movimiento de AJUSTE (reutiliza reconcileAccount, §5.7: categoría de sistema
// "Ajuste / Reconciliación", excluida de los reportes de gasto). Los saldos derivados (§2)
// quedan intactos: nunca se escribe cachedBalance directamente.
import { reconcileAccount } from './reconciliationService';
import { computeRevaluation, buildRevaluationNote } from '../domain/revaluation';
import type { Account } from '../domain/types';
import type { ExchangeRateTable } from '../domain/ExchangeRateTable';

/**
 * Revalúa las cuentas en divisa que estén desalineadas con la tasa del día. Devuelve cuántos
 * ajustes creó. Idempotente: si el saldo ya coincide, computeRevaluation da null y no escribe.
 */
export async function revalueForeignAccounts(
  uid: string,
  accounts: Account[],
  table: ExchangeRateTable,
): Promise<number> {
  let created = 0;
  for (const account of accounts) {
    if (account.archived || !account.foreignCurrency) continue;
    const result = computeRevaluation(account, table);
    if (!result) continue;
    const note = buildRevaluationNote(account.foreignCurrency, result.rateToCop);
    if (await reconcileAccount(uid, account, result.targetCop, note)) created += 1;
  }
  return created;
}
