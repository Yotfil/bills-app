// Servicio de transacciones: el ÚNICO camino para escribir movimientos (CLAUDE.md §5.4, §9.3).
//
// Por qué aquí y no en el CRUD genérico: cada movimiento mueve saldos. La fuente de verdad son los
// movimientos; `cachedBalance`/`cachedDebt` son cachés. El documento del movimiento y el ajuste de las
// cachés se escriben en UN `writeBatch` ATÓMICO, usando `increment()` (conmutativo y seguro frente a
// carreras: no necesita leer el valor del servidor). **Offline-first (§3):** a diferencia de
// `runTransaction` —que EXIGE conexión para leer el valor del servidor—, `writeBatch` se ENCOLA sin red
// y sincroniza al reconectar, así registrar un gasto funciona offline. La lectura del movimiento viejo
// (editar/borrar) usa `getDoc`, que offline cae a la caché local. La red de seguridad ante cualquier
// desfase de cachés sigue siendo `recalculateBalances` ("Recalcular saldos").
import {
  collection,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type DocumentReference,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  accountsCol,
  cardsCol,
  fixedMonthlyCol,
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
import { applyBudgetBoosts } from './budgetBoostService';
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
 * Aplica un delta de saldos a las cachés de las entidades afectadas, dentro de un `writeBatch`. Cada
 * mapa del delta dice cuánto cambia esa caché (con `increment()`, conmutativo):
 *   cuentas → cachedBalance | tarjetas → cachedDebt | créditos → cachedBalance
 */
function applyDeltaToBatch(batch: WriteBatch, uid: string, delta: LedgerDelta): void {
  const stamp = serverTimestamp();
  for (const [id, amount] of Object.entries(delta.accounts)) {
    if (amount === 0) continue;
    batch.update(rawDoc(accountsCol(uid), id), {
      cachedBalance: increment(amount),
      updatedAt: stamp,
    });
  }
  for (const [id, amount] of Object.entries(delta.cards)) {
    if (amount === 0) continue;
    batch.update(rawDoc(cardsCol(uid), id), { cachedDebt: increment(amount), updatedAt: stamp });
  }
  for (const [id, amount] of Object.entries(delta.loans)) {
    if (amount === 0) continue;
    batch.update(rawDoc(loansCol(uid), id), { cachedBalance: increment(amount), updatedAt: stamp });
  }
}

/** Crea un movimiento y aplica su efecto en los saldos, en un batch atómico. Devuelve el id.
 * No requiere lectura → se ENCOLA offline. */
export async function createTransaction(uid: string, draft: TransactionDraft): Promise<string> {
  assertValidTransaction(draft); // una transacción inválida no se guarda (§11)
  const delta = transactionDelta(draft);
  const newRef = newRawDoc(transactionsCol(uid)); // id generado antes del commit

  const batch = writeBatch(requireDb());
  batch.set(newRef, {
    ...draft,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  applyDeltaToBatch(batch, uid, delta);
  await batch.commit(); // offline: encola y resuelve; online: escribe ya

  // Aumentos de presupuesto ligados al ingreso (§5.9): suben el tope del mes elegido. Paso aparte
  // del batch (no afectan saldos); si fallara, el ingreso queda sin aumento y se reaplica.
  await applyBudgetBoosts(uid, draft.budgetBoosts, 1);

  return newRef.id;
}

/**
 * Edita un movimiento: revierte su efecto anterior y aplica el nuevo (§9.3), recalculando los saldos
 * afectados. Lee el movimiento viejo con `getDoc` (offline cae a la caché local) y escribe en batch.
 */
export async function editTransaction(
  uid: string,
  id: string,
  newDraft: TransactionDraft,
): Promise<void> {
  assertValidTransaction(newDraft);
  const ref = doc(transactionsCol(uid), id);

  const snap = await getDoc(ref); // online: servidor; offline: caché local
  if (!snap.exists()) throw new Error('La transacción a editar no existe.');
  const oldTxn = snap.data();
  const oldBoosts = oldTxn.budgetBoosts;

  const delta = editTransactionDelta(oldTxn, newDraft);
  const batch = writeBatch(requireDb());
  batch.update(rawDoc(transactionsCol(uid), id), {
    ...newDraft,
    // Siempre refleja los boosts del nuevo draft (vacío si el tipo dejó de ser ingreso): así no
    // queda un `budgetBoosts` viejo que se revertiría doble al borrar luego el movimiento.
    budgetBoosts: newDraft.budgetBoosts ?? [],
    updatedAt: serverTimestamp(),
  });
  applyDeltaToBatch(batch, uid, delta);
  await batch.commit();

  // Aumentos de presupuesto ligados (§5.9): revierte los viejos y aplica los nuevos.
  await applyBudgetBoosts(uid, oldBoosts, -1);
  await applyBudgetBoosts(uid, newDraft.budgetBoosts, 1);
}

/**
 * Elimina un movimiento y revierte su efecto en los saldos, en un batch atómico. Si el movimiento lo
 * generó un fijo al pagarse (`fixedMonthlyId`), ese fijo vuelve a "Pendiente" en el MISMO batch: así
 * borrar el movimiento desde el Registro deja el fijo consistente. Solo se revierte si el fijo aún
 * apunta a ESTE movimiento (no si ya se volvió a pagar con otro). Lecturas con `getDoc` (offline → caché).
 */
export async function deleteTransaction(uid: string, id: string): Promise<void> {
  const snap = await getDoc(doc(transactionsCol(uid), id));
  if (!snap.exists()) return; // ya no existe: nada que revertir
  const data = snap.data();

  // Si el movimiento lo creó un fijo, ese fijo vuelve a pendiente — solo si aún apunta a ESTE.
  let fixedRef: DocumentReference | null = null;
  if (data.fixedMonthlyId) {
    const fixedSnap = await getDoc(doc(fixedMonthlyCol(uid), data.fixedMonthlyId));
    if (fixedSnap.exists() && fixedSnap.data().transactionId === id) {
      fixedRef = rawDoc(fixedMonthlyCol(uid), data.fixedMonthlyId);
    }
  }

  const delta = revertTransaction(data);
  const batch = writeBatch(requireDb());
  batch.delete(rawDoc(transactionsCol(uid), id));
  applyDeltaToBatch(batch, uid, delta);
  if (fixedRef) {
    batch.update(fixedRef, {
      status: 'pending',
      transactionId: null,
      paidAmount: null,
      paidAt: null,
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();

  // Revierte los aumentos de presupuesto que este ingreso había aplicado (§5.9).
  await applyBudgetBoosts(uid, data.budgetBoosts, -1);
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
