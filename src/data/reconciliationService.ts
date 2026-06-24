// Reconciliación de cuentas (CLAUDE.md §5.7). Los saldos NO se editan: el usuario dice "el
// saldo real es X" y se crea un movimiento de AJUSTE por el desfase, que pasa por
// transactionService (baja/sube el saldo de forma atómica). Usa la categoría de sistema
// "Ajuste / Reconciliación" para no contaminar los reportes de gasto.
import { categoriesCol } from './collections';
import { listAll } from './crud';
import { ADJUSTMENT_CATEGORY_NAME } from './categoryRepository';
import { createTransaction } from './transactionService';
import { buildReconciliationAdjustment } from '../domain/reconciliation';
import { nowTimestamp } from '../lib/date';
import type { Account } from '../domain/types';

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
 * Reconcilia una cuenta contra su saldo real. Crea el movimiento de ajuste por el desfase
 * (increase o decrease) y devuelve true; si no hay desfase, no hace nada y devuelve false.
 */
export async function reconcileAccount(
  uid: string,
  account: Account,
  realBalance: number,
  note?: string | null,
): Promise<boolean> {
  const adjustmentCategoryId = await getAdjustmentCategoryId(uid);
  const draft = buildReconciliationAdjustment(account.cachedBalance, realBalance, {
    account: { kind: 'account', id: account.id },
    adjustmentCategoryId,
    date: nowTimestamp(),
    note: note ?? null,
  });
  if (!draft) return false; // saldo real = registrado: nada que ajustar
  await createTransaction(uid, draft);
  return true;
}
