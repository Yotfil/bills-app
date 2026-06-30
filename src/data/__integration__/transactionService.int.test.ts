// Tests de INTEGRACIÓN contra el Firebase Emulator Suite (CLAUDE.md §12.1, seguimiento técnico).
// A diferencia de los unit (lógica pura) y los e2e (UI), estos ejercen los repositorios + el
// `transactionService` REALES contra Firestore (emulador), incluido el efecto en las cachés de saldo
// y el **caso offline** (clave para el write path sin `runTransaction`).
//
// Cómo correr: `npm run test:int` (levanta nada; requiere el emulador YA arriba: `npm run emulators`).
// La suite se SALTA sola si no está en modo emulador o el emulador no responde, para que `npm test`
// (unit) siga verde sin infraestructura.
//
// `fake-indexeddb/auto` debe importarse ANTES que `firebase` para que `persistentLocalCache` tenga
// IndexedDB en jsdom (lo necesita la persistencia offline).
import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { disableNetwork, doc, enableNetwork, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { accountsCol } from '../collections';
import { createAccount } from '../accountRepository';
import { createTransaction, deleteTransaction, editTransaction } from '../transactionService';
import { nowTimestamp } from '../../lib/date';
import type { TransactionDraft } from '../../domain/types';

const FIRESTORE_HOST = '127.0.0.1:8080';
const PROJECT = 'demo-bills';

async function emulatorReachable(): Promise<boolean> {
  try {
    await fetch(`http://${FIRESTORE_HOST}/`);
    return true;
  } catch {
    return false;
  }
}

// Solo corren en modo emulador Y con el emulador arriba (si no, se saltan).
const ENABLED =
  import.meta.env.VITE_USE_EMULATOR === '1' && !!db && !!auth && (await emulatorReachable());

/** Aprueba un correo en la allowlist saltándose las reglas (Bearer owner = admin), como en e2e. */
async function allowEmail(email: string): Promise<void> {
  const path = `projects/${PROJECT}/databases/(default)/documents/allowlist/${encodeURIComponent(email)}`;
  await fetch(`http://${FIRESTORE_HOST}/v1/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {} }),
  });
}

describe.skipIf(!ENABLED)('transactionService (integración con emulador)', () => {
  let uid: string;

  beforeAll(async () => {
    const email = `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
    await allowEmail(email);
    const cred = await createUserWithEmailAndPassword(auth!, email, 'test1234');
    uid = cred.user.uid;
  });

  const expense = (accId: string, amount: number): TransactionDraft => ({
    date: nowTimestamp(),
    concept: 'Test',
    type: 'expense',
    amount,
    categoryId: 'cat-test',
    source: { kind: 'account', id: accId },
    destination: null,
    adjustmentDirection: null,
    tags: [],
    note: null,
    fixedMonthlyId: null,
    periodMonth: null,
  });

  const balanceOf = async (accId: string): Promise<number> => {
    const snap = await getDoc(doc(accountsCol(uid), accId));
    return snap.data()?.cachedBalance ?? NaN;
  };

  it('createAccount: round-trip, el saldo arranca igual a la semilla', async () => {
    const accId = await createAccount(uid, { name: 'Caja', type: 'cash', initialBalance: 100_000 });
    expect(await balanceOf(accId)).toBe(100_000);
  });

  it('createTransaction (gasto): baja el cachedBalance de la cuenta', async () => {
    const accId = await createAccount(uid, {
      name: 'Banco',
      type: 'savings',
      initialBalance: 500_000,
    });
    await createTransaction(uid, expense(accId, 30_000));
    expect(await balanceOf(accId)).toBe(470_000);
  });

  it('editTransaction: ajusta el saldo al nuevo monto', async () => {
    const accId = await createAccount(uid, {
      name: 'Edit',
      type: 'savings',
      initialBalance: 500_000,
    });
    const txnId = await createTransaction(uid, expense(accId, 30_000)); // 470.000
    await editTransaction(uid, txnId, expense(accId, 50_000)); // -20.000 más → 450.000
    expect(await balanceOf(accId)).toBe(450_000);
  });

  it('deleteTransaction: revierte el efecto en el saldo', async () => {
    const accId = await createAccount(uid, {
      name: 'Del',
      type: 'savings',
      initialBalance: 500_000,
    });
    const txnId = await createTransaction(uid, expense(accId, 30_000)); // 470.000
    await deleteTransaction(uid, txnId);
    expect(await balanceOf(accId)).toBe(500_000);
  });

  // Caso OFFLINE (valida el write path sin runTransaction): offline, registrar un gasto NO debe ERRAR
  // (con runTransaction sí fallaba: exige red); la escritura se encola y, al reconectar, su `commit`
  // resuelve y el saldo del servidor queda correcto.
  it('OFFLINE: el gasto no erra y sincroniza al reconectar', async () => {
    const accId = await createAccount(uid, {
      name: 'Off',
      type: 'savings',
      initialBalance: 200_000,
    });

    await disableNetwork(db!);
    // Offline el commit queda PENDIENTE (no resuelve hasta reconectar), pero NO debe rechazar.
    const pending = createTransaction(uid, expense(accId, 25_000));
    let rejectedOffline = false;
    void pending.catch(() => {
      rejectedOffline = true;
    });
    await new Promise((r) => setTimeout(r, 300));
    expect(rejectedOffline).toBe(false); // con runTransaction erraba offline; con writeBatch no

    await enableNetwork(db!); // al reconectar, la escritura encolada se confirma
    await pending; // ahora resuelve el commit (ack del servidor)
    expect(await balanceOf(accId)).toBe(175_000); // sincronizó con el saldo correcto
  }, 20_000);
});
