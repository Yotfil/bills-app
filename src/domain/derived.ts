// Valores DERIVADOS (CLAUDE.md §4, §5.1, §5.5, §5.6). No se persisten: se calculan al leer
// a partir de las cachés y los fijos del mes. Son funciones puras.
//
// Cuentas en divisa (decisión 2026-07-09): su saldo COP es la conversión EN VIVO con la tasa
// del día (accountBalanceCop), por eso el disponible y el número-héroe reciben la tabla de
// tasas. Con `table = null` (o cuentas COP) el comportamiento es idéntico al histórico.
import { accountBalanceCop } from './foreignBalance';
import type { Account, CreditCard, FixedObligationMonthly, Loan } from './types';
import type { ExchangeRateTable } from './ExchangeRateTable';

/**
 * Reservado de una cuenta (§5.1, §5.2): Σ de los fijos del mes en estado 'allocated' cuyo
 * medio de pago apunta a esa cuenta. Es dinero comprometido pero aún no pagado.
 */
export function accountReserved(
  monthlyFixeds: FixedObligationMonthly[],
  accountId: string,
): number {
  return monthlyFixeds
    .filter(
      (f) =>
        f.status === 'allocated' &&
        f.paymentMethod.kind === 'account' &&
        f.paymentMethod.id === accountId,
    )
    .reduce((sum, f) => sum + f.budgetedAmount, 0);
}

/** Disponible de una cuenta = saldo total (COP en vivo) − reservado (§5.1). */
export function accountAvailable(
  account: Account,
  monthlyFixeds: FixedObligationMonthly[],
  table: ExchangeRateTable | null,
): number {
  return accountBalanceCop(account, table) - accountReserved(monthlyFixeds, account.id);
}

/** Cupo disponible de una tarjeta = cupo total − deuda (§5.5). */
export function cardAvailableCredit(card: CreditCard): number {
  return card.creditLimit - card.cachedDebt;
}

/**
 * Progreso de amortización de un crédito = 1 − (saldo / monto original) (§5.6).
 * Acotado a [0, 1]. Si originalAmount es 0, no hay nada que amortizar → progreso 1.
 */
export function loanProgress(loan: Loan): number {
  if (loan.originalAmount <= 0) return 1;
  const raw = 1 - loan.cachedBalance / loan.originalAmount;
  return Math.min(1, Math.max(0, raw));
}

/**
 * NÚMERO-HÉROE (§4): Disponible real = Σ(disponible de cuentas de uso) − Σ(reservado).
 * Excluye las "bolsas de ahorro" (savingsBucket): dinero apartado que no es de libre uso.
 */
export function disponibleReal(
  accounts: Account[],
  monthlyFixeds: FixedObligationMonthly[],
  table: ExchangeRateTable | null,
): number {
  return accounts
    .filter((acc) => !acc.savingsBucket)
    .reduce((sum, acc) => sum + accountAvailable(acc, monthlyFixeds, table), 0);
}
