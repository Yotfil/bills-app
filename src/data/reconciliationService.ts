// Reconciliación de cuentas, tarjetas y créditos (CLAUDE.md §5.7). Los saldos/deudas NO se
// editan: el usuario dice "el valor real es X" y se crea un movimiento de AJUSTE por el desfase,
// que pasa por transactionService (ajusta el valor de forma atómica). Usa la categoría de sistema
// "Ajuste / Reconciliación" para no contaminar los reportes de gasto.
import { categoriesCol } from './collections';
import { listAll } from './crud';
import { ADJUSTMENT_CATEGORY_NAME } from './categoryRepository';
import { createTransaction } from './transactionService';
import { buildReconciliationAdjustment } from '../domain/reconciliation';
import { nowTimestamp } from '../lib/date';
import type { Account, CreditCard, EntityRef, Loan } from '../domain/types';

/** Busca el id de la categoría de sistema de ajustes (sembrada en el primer login, §6). */
export async function getAdjustmentCategoryId(uid: string): Promise<string> {
  const categories = await listAll(categoriesCol(uid));
  const adjustment = categories.find((c) => c.isSystem && c.name === ADJUSTMENT_CATEGORY_NAME);
  if (!adjustment) {
    throw new Error('No existe la categoría de sistema "Ajuste / Reconciliación".');
  }
  return adjustment.id;
}

/**
 * Reconcilia una entidad (cuenta/tarjeta/crédito) llevando su valor registrado al real. Crea el
 * movimiento de ajuste por el desfase (increase o decrease) y devuelve true; si no hay desfase,
 * no hace nada y devuelve false.
 */
async function reconcileEntity(
  uid: string,
  source: EntityRef,
  registeredValue: number,
  realValue: number,
  note?: string | null,
): Promise<boolean> {
  const adjustmentCategoryId = await getAdjustmentCategoryId(uid);
  const draft = buildReconciliationAdjustment(registeredValue, realValue, {
    source,
    adjustmentCategoryId,
    date: nowTimestamp(),
    note: note ?? null,
  });
  if (!draft) return false; // valor real = registrado: nada que ajustar
  await createTransaction(uid, draft);
  return true;
}

/** Reconcilia el SALDO de una cuenta (§5.7). */
export const reconcileAccount = (
  uid: string,
  account: Account,
  realBalance: number,
  note?: string | null,
): Promise<boolean> =>
  reconcileEntity(
    uid,
    { kind: 'account', id: account.id },
    account.cachedBalance,
    realBalance,
    note,
  );

/** Reconcilia la DEUDA de una tarjeta de crédito (§5.5, §5.7). */
export const reconcileCard = (
  uid: string,
  card: CreditCard,
  realDebt: number,
  note?: string | null,
): Promise<boolean> =>
  reconcileEntity(uid, { kind: 'card', id: card.id }, card.cachedDebt, realDebt, note);

/** Reconcilia el SALDO pendiente de un crédito (§5.6, §5.7). */
export const reconcileLoan = (
  uid: string,
  loan: Loan,
  realBalance: number,
  note?: string | null,
): Promise<boolean> =>
  reconcileEntity(uid, { kind: 'loan', id: loan.id }, loan.cachedBalance, realBalance, note);
