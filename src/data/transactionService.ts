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
  type BalanceSeeds,
  type LedgerDelta,
} from '../domain/ledger';
import { listAll } from './crud';
import type { TransactionDraft } from '../domain/types';
import type { RecalculationCorrections } from './RecalculationCorrections';

export type { RecalculationCorrections } from './RecalculationCorrections';

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
 * Recálculo total de TODOS los saldos (CLAUDE.md §9.3): reconstruye `cachedBalance` de cuentas
 * y créditos y `cachedDebt` de tarjetas desde su semilla de onboarding más todos los movimientos,
 * y corrige las cachés que hayan divergido. Devuelve las correcciones aplicadas por entidad (por
 * si se quiere auditar/loguear). Es la válvula de seguridad cuando una caché incremental se desfasa.
 *
 * Semillas: las cuentas guardan `initialBalance`; tarjetas y créditos guardan `initialDebt` /
 * `seedBalance`. Los docs creados ANTES de persistir esas semillas (tarjetas/créditos viejos) no
 * la tienen: se RECUPERA asumiendo que la caché actual es correcta (semilla = caché − Σ deltas) y
 * se PERSISTE de paso (backfill), para que a partir de aquí el recálculo detecte divergencias.
 */
export async function recalculateBalances(uid: string): Promise<RecalculationCorrections> {
  const [accounts, cards, loans, transactions] = await Promise.all([
    listAll(accountsCol(uid)),
    listAll(cardsCol(uid)),
    listAll(loansCol(uid)),
    listAll(transactionsCol(uid)),
  ]);

  // Suma pura de los deltas (semillas en 0): sirve para recuperar la semilla de los docs viejos.
  const deltaOnly = recomputeBalances({ accounts: {}, cards: {}, loans: {} }, transactions);

  // Semilla a usar: la persistida si existe; si no (doc viejo), la derivada de la caché actual.
  const seedFor = (cache: number, persisted: number | undefined, deltaSum: number): number =>
    persisted ?? cache - deltaSum;

  const seeds: BalanceSeeds = {
    accounts: Object.fromEntries(accounts.map((a) => [a.id, a.initialBalance])),
    cards: Object.fromEntries(
      cards.map((c) => [c.id, seedFor(c.cachedDebt, c.initialDebt, deltaOnly.cards[c.id] ?? 0)]),
    ),
    loans: Object.fromEntries(
      loans.map((l) => [l.id, seedFor(l.cachedBalance, l.seedBalance, deltaOnly.loans[l.id] ?? 0)]),
    ),
  };

  const recomputed = recomputeBalances(seeds, transactions);

  const corrections: RecalculationCorrections = { accounts: {}, cards: {}, loans: {} };
  await runTransaction(requireDb(), async (tx) => {
    for (const account of accounts) {
      const correct = recomputed.accounts[account.id] ?? account.initialBalance;
      if (correct !== account.cachedBalance) {
        corrections.accounts[account.id] = correct - account.cachedBalance;
        tx.update(rawDoc(accountsCol(uid), account.id), {
          cachedBalance: correct,
          updatedAt: serverTimestamp(),
        });
      }
    }
    for (const card of cards) {
      const seed = seeds.cards[card.id] ?? card.cachedDebt;
      const correct = recomputed.cards[card.id] ?? seed;
      const patch: Record<string, unknown> = {};
      if (correct !== card.cachedDebt) {
        corrections.cards[card.id] = correct - card.cachedDebt;
        patch.cachedDebt = correct;
      }
      if (card.initialDebt === undefined) patch.initialDebt = seed; // backfill semilla del doc viejo
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = serverTimestamp();
        tx.update(rawDoc(cardsCol(uid), card.id), patch);
      }
    }
    for (const loan of loans) {
      const seed = seeds.loans[loan.id] ?? loan.cachedBalance;
      const correct = recomputed.loans[loan.id] ?? seed;
      const patch: Record<string, unknown> = {};
      if (correct !== loan.cachedBalance) {
        corrections.loans[loan.id] = correct - loan.cachedBalance;
        patch.cachedBalance = correct;
      }
      if (loan.seedBalance === undefined) patch.seedBalance = seed; // backfill semilla del doc viejo
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = serverTimestamp();
        tx.update(rawDoc(loansCol(uid), loan.id), patch);
      }
    }
  });

  return corrections;
}
