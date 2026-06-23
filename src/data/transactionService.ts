// Servicio de transacciones: el ÚNICO camino para escribir movimientos (CLAUDE.md §5.4, §9.3).
//
// Por qué aquí y no en el CRUD genérico: cada movimiento mueve saldos. La fuente de verdad
// son los movimientos; `cachedBalance`/`cachedDebt` son cachés. Para que no se desincronicen
// ante escrituras concurrentes, el documento del movimiento y la actualización de las cachés
// se escriben en UNA transacción atómica (`runTransaction`). Usamos `increment()` para que el
// ajuste de la caché sea seguro frente a carreras.
import {
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  type DocumentReference,
  type Transaction as FsTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  accountsCol,
  cardsCol,
  loansCol,
  transactionsCol,
  CURRENT_SCHEMA_VERSION,
} from './collections';
import { assertValidTransaction } from '../domain/validation';
import {
  editTransactionDelta,
  recomputeBalances,
  revertTransaction,
  transactionDelta,
  type LedgerDelta,
} from '../domain/ledger';
import { listAll } from './crud';
import type { TransactionDraft } from '../domain/types';

function requireDb() {
  if (!db) throw new Error('Firestore no está configurado. Define las claves en .env.local.');
  return db;
}

/** Ref "cruda" (sin converter) para escribir/actualizar campos sueltos con FieldValue. */
function rawDoc(col: { path: string }, id: string): DocumentReference {
  return doc(requireDb(), col.path, id);
}

/** Nueva ref con id autogenerado (cruda), para escribir un documento nuevo sin converter. */
function newRawDoc(col: { path: string }): DocumentReference {
  return doc(collection(requireDb(), col.path));
}

/**
 * Aplica un delta de saldos a las cachés de las entidades afectadas, dentro de una
 * transacción de Firestore. Cada mapa del delta dice cuánto cambia esa caché:
 *   cuentas → cachedBalance | tarjetas → cachedDebt | créditos → cachedBalance
 */
function applyDeltaToCaches(tx: FsTransaction, uid: string, delta: LedgerDelta): void {
  const stamp = serverTimestamp();
  for (const [id, amount] of Object.entries(delta.accounts)) {
    if (amount === 0) continue;
    tx.update(rawDoc(accountsCol(uid), id), { cachedBalance: increment(amount), updatedAt: stamp });
  }
  for (const [id, amount] of Object.entries(delta.cards)) {
    if (amount === 0) continue;
    tx.update(rawDoc(cardsCol(uid), id), { cachedDebt: increment(amount), updatedAt: stamp });
  }
  for (const [id, amount] of Object.entries(delta.loans)) {
    if (amount === 0) continue;
    tx.update(rawDoc(loansCol(uid), id), { cachedBalance: increment(amount), updatedAt: stamp });
  }
}

/** Crea un movimiento y aplica su efecto en los saldos, todo atómico. Devuelve el id. */
export async function createTransaction(uid: string, draft: TransactionDraft): Promise<string> {
  assertValidTransaction(draft); // una transacción inválida no se guarda (§11)
  const delta = transactionDelta(draft);
  const newRef = newRawDoc(transactionsCol(uid)); // id generado antes de la transacción

  await runTransaction(requireDb(), async (tx) => {
    tx.set(newRef, {
      ...draft,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    applyDeltaToCaches(tx, uid, delta);
  });

  return newRef.id;
}

/**
 * Edita un movimiento: revierte su efecto anterior y aplica el nuevo (§9.3), recalculando
 * los saldos afectados. Lee el movimiento viejo dentro de la transacción.
 */
export async function editTransaction(
  uid: string,
  id: string,
  newDraft: TransactionDraft,
): Promise<void> {
  assertValidTransaction(newDraft);
  const ref = doc(transactionsCol(uid), id);

  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(ref); // lectura ANTES de cualquier escritura
    if (!snap.exists()) throw new Error('La transacción a editar no existe.');
    const oldTxn = snap.data();

    const delta = editTransactionDelta(oldTxn, newDraft);
    tx.update(rawDoc(transactionsCol(uid), id), {
      ...newDraft,
      updatedAt: serverTimestamp(),
    });
    applyDeltaToCaches(tx, uid, delta);
  });
}

/** Elimina un movimiento y revierte su efecto en los saldos, atómico. */
export async function deleteTransaction(uid: string, id: string): Promise<void> {
  const ref = doc(transactionsCol(uid), id);

  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return; // ya no existe: nada que revertir
    const delta = revertTransaction(snap.data());
    tx.delete(rawDoc(transactionsCol(uid), id));
    applyDeltaToCaches(tx, uid, delta);
  });
}

/**
 * Recálculo total de los saldos de CUENTAS (CLAUDE.md §9.3): reconstruye `cachedBalance`
 * desde la semilla (`initialBalance`) más todos los movimientos, y corrige las cachés que
 * hayan divergido. Devuelve las correcciones aplicadas (por si se quiere auditar/loguear).
 *
 * Nota: las tarjetas y créditos no guardan hoy una "semilla" separada de su deuda/saldo de
 * onboarding, así que su recálculo total queda pendiente hasta agregar ese campo (registrado
 * en MEMORY.md). Su caché se mantiene de forma incremental por movimiento, que es correcta.
 */
export async function recalculateAccountBalances(uid: string): Promise<Record<string, number>> {
  const [accounts, transactions] = await Promise.all([
    listAll(accountsCol(uid)),
    listAll(transactionsCol(uid)),
  ]);

  const seeds = {
    accounts: Object.fromEntries(accounts.map((a) => [a.id, a.initialBalance])),
    cards: {},
    loans: {},
  };
  const recomputed = recomputeBalances(seeds, transactions);

  const corrections: Record<string, number> = {};
  await runTransaction(requireDb(), async (tx) => {
    for (const account of accounts) {
      const correct = recomputed.accounts[account.id] ?? account.initialBalance;
      if (correct !== account.cachedBalance) {
        corrections[account.id] = correct - account.cachedBalance;
        tx.update(rawDoc(accountsCol(uid), account.id), {
          cachedBalance: correct,
          updatedAt: serverTimestamp(),
        });
      }
    }
  });

  return corrections;
}
