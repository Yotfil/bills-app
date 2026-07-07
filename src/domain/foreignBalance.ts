// Saldo COP EN VIVO de las cuentas en moneda extranjera (decisión 2026-07-09): una cuenta en
// divisa es MONOMONEDA — su fuente de verdad es `foreignAmount` (movida solo por movimientos en
// esa divisa) y el COP que se muestra es SIEMPRE la conversión con la tasa del día, calculada al
// leer. Ya no hay ajustes automáticos de revaluación: el ledger COP interno (`cachedBalance`)
// solo queda como fallback cuando no hay tasa disponible (offline sin caché).
import { copPerUnit, foreignToCop } from './currencyConversion';
import type { Account } from './types';
import type { ExchangeRateTable } from './ExchangeRateTable';

type BalanceAccount = Pick<Account, 'cachedBalance' | 'foreignCurrency' | 'foreignAmount'>;

/** Tasa divisa→COP de la cuenta con la tabla del día; null si la cuenta es COP o no hay tasa. */
export function accountCopRate(
  account: Pick<Account, 'foreignCurrency'>,
  table: ExchangeRateTable | null,
): number | null {
  if (!account.foreignCurrency || !table) return null;
  return copPerUnit(table, account.foreignCurrency);
}

/**
 * Saldo en COP de una cuenta, para mostrar y derivar (disponible, totales): en cuentas COP es
 * `cachedBalance`; en cuentas en divisa es `foreignAmount × tasa del día`. Degradado: sin tasa
 * (offline sin caché) o sin monto en divisa, cae a `cachedBalance` (el mejor valor conocido).
 */
export function accountBalanceCop(
  account: BalanceAccount,
  table: ExchangeRateTable | null,
): number {
  if (account.foreignAmount == null) return account.cachedBalance;
  const rate = accountCopRate(account, table);
  if (rate === null) return account.cachedBalance;
  return foreignToCop(account.foreignAmount, rate);
}

/**
 * Equivalente en divisa de un valor COP (solo display, p.ej. el disponible de una cuenta USD).
 * Redondeado a 2 decimales; los montos COP del dominio siguen siendo enteros (§3).
 */
export function copToForeign(cop: number, rateToCop: number): number {
  return Math.round((cop / rateToCop) * 100) / 100;
}
