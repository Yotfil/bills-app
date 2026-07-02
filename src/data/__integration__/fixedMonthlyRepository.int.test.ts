// Tests de INTEGRACIÓN de payFixed contra el Firebase Emulator Suite (CLAUDE.md §5.3, §9.3).
// Validan que pagar un fijo escribe el movimiento, el efecto en el saldo y la marca de pagado
// en UN commit atómico (writeBatch), incluido el caso offline (el commit se encola sin red).
//
// Cómo correr: `npm run test:int` (requiere el emulador YA arriba: `npm run emulators`).
// La suite se SALTA sola si no está en modo emulador o el emulador no responde.
import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { disableNetwork, doc, enableNetwork, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { accountsCol, fixedMonthlyCol, transactionsCol } from '../collections';
import { createAccount } from '../accountRepository';
import { create, getById } from '../crud';
import { payFixed } from '../fixedMonthlyRepository';
import type { CreateInput } from '../crud';
import type { FixedObligationMonthly } from '../../domain/types';

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

describe.skipIf(!ENABLED)('payFixed (integración con emulador)', () => {
  let uid: string;

  beforeAll(async () => {
    const email = `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
    await allowEmail(email);
    const cred = await createUserWithEmailAndPassword(auth!, email, 'test1234');
    uid = cred.user.uid;
  });

  const fixedDraft = (accId: string, amount: number): CreateInput<FixedObligationMonthly> => ({
    month: '2026-07',
    templateId: 'tpl-test',
    name: 'Arriendo test',
    budgetedAmount: amount,
    categoryId: 'cat-test',
    payKind: 'expense',
    debtTargetId: null,
    consumesBudget: false,
    paymentMethod: { kind: 'account', id: accId },
    status: 'pending',
    paidAmount: null,
    transactionId: null,
    allocatedAt: null,
    paidAt: null,
  });

  /** Crea la instancia mensual y la relee (payFixed recibe el objeto de dominio con su id). */
  const seedFixed = async (accId: string, amount: number): Promise<FixedObligationMonthly> => {
    const id = await create(fixedMonthlyCol(uid), fixedDraft(accId, amount));
    const fixed = await getById(fixedMonthlyCol(uid), id);
    if (!fixed) throw new Error('No se pudo sembrar el fijo de prueba');
    return fixed;
  };

  const balanceOf = async (accId: string): Promise<number> => {
    const snap = await getDoc(doc(accountsCol(uid), accId));
    return snap.data()?.cachedBalance ?? NaN;
  };

  it('crea el movimiento, baja el saldo y enlaza el fijo (todo o nada)', async () => {
    const accId = await createAccount(uid, {
      name: 'Pago',
      type: 'savings',
      initialBalance: 2_000_000,
    });
    const fixed = await seedFixed(accId, 1_650_000);

    await payFixed(uid, fixed, {
      amount: 1_600_000, // monto REAL distinto al presupuestado (§5.3)
      paymentMethod: fixed.paymentMethod,
    });

    // El fijo quedó pagado con el monto real y enlazado al movimiento.
    const paid = await getById(fixedMonthlyCol(uid), fixed.id);
    expect(paid?.status).toBe('paid');
    expect(paid?.paidAmount).toBe(1_600_000);
    expect(paid?.transactionId).toBeTruthy();

    // El movimiento existe, apunta de vuelta al fijo, y el saldo bajó por el monto real.
    const txnSnap = await getDoc(doc(transactionsCol(uid), paid!.transactionId!));
    expect(txnSnap.exists()).toBe(true);
    expect(txnSnap.data()?.fixedMonthlyId).toBe(fixed.id);
    expect(await balanceOf(accId)).toBe(400_000);
  });

  // Caso OFFLINE: payFixed no hace lecturas, así que su ÚNICO commit (movimiento + marca de
  // pagado) se encola sin red y aterriza completo al reconectar — nunca "a medias".
  it('OFFLINE: el pago se encola completo y sincroniza al reconectar', async () => {
    const accId = await createAccount(uid, {
      name: 'PagoOff',
      type: 'savings',
      initialBalance: 500_000,
    });
    const fixed = await seedFixed(accId, 100_000);

    await disableNetwork(db!);
    const pending = payFixed(uid, fixed, {
      amount: 100_000,
      paymentMethod: fixed.paymentMethod,
    });
    let rejectedOffline = false;
    void pending.catch(() => {
      rejectedOffline = true;
    });
    await new Promise((r) => setTimeout(r, 300));
    expect(rejectedOffline).toBe(false); // el commit queda pendiente, no rechaza

    await enableNetwork(db!);
    await pending; // ack del servidor al reconectar

    const paid = await getById(fixedMonthlyCol(uid), fixed.id);
    expect(paid?.status).toBe('paid');
    expect(paid?.transactionId).toBeTruthy();
    expect(await balanceOf(accId)).toBe(400_000);
  }, 20_000);
});
