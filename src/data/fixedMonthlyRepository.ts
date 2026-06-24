// Instancia mensual de obligaciones fijas (CLAUDE.md §5.2, §5.3, §5.10). La escritura de
// movimientos (al pagar) pasa SIEMPRE por transactionService (efectos atómicos en saldos).
import {
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentReference,
} from 'firebase/firestore';
import { fixedMonthlyCol, fixedTemplatesCol } from './collections';
import { create, listAll } from './crud';
import { createTransaction } from './transactionService';
import { generateMonthlyFixeds } from '../domain/rollover';
import { buildTransactionFromFixed } from '../domain/fixed';
import { nowTimestamp } from '../lib/date';
import type { PayFixedInput } from './PayFixedInput';
import type { FixedObligationMonthly } from '../domain/types';

export type { PayFixedInput } from './PayFixedInput';

/** Ref sin converter para actualizar campos sueltos con FieldValue. */
function rawDoc(uid: string, id: string): DocumentReference {
  return doc(fixedMonthlyCol(uid), id) as unknown as DocumentReference;
}

/** Se suscribe a los fijos de un mes 'YYYY-MM' en tiempo real (§8.3). */
export function subscribeFixedMonthly(
  uid: string,
  month: string,
  onChange: (items: FixedObligationMonthly[]) => void,
): () => void {
  const q = query(fixedMonthlyCol(uid), where('month', '==', month));
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => d.data())));
}

/**
 * Genera los fijos del mes desde la plantilla, sin duplicar los ya existentes (§5.10).
 * Devuelve cuántos creó.
 */
export async function generateFixedMonthly(uid: string, month: string): Promise<number> {
  const existingSnap = await getDocs(query(fixedMonthlyCol(uid), where('month', '==', month)));
  const existingTemplateIds = existingSnap.docs.map((d) => d.data().templateId);
  const templates = await listAll(fixedTemplatesCol(uid));

  const drafts = generateMonthlyFixeds(templates, month, existingTemplateIds);
  await Promise.all(drafts.map((draft) => create(fixedMonthlyCol(uid), draft)));
  return drafts.length;
}

/**
 * Pendiente → Destinado (§5.2): NO mueve el saldo; el reservado de la cuenta es derivado de
 * los fijos en 'allocated'. Solo cambia el estado.
 */
export async function markFixedAllocated(uid: string, id: string): Promise<void> {
  await updateDoc(rawDoc(uid, id), {
    status: 'allocated',
    allocatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Deshacer un destinado (Destinado → Pendiente) antes de pagar: libera el reservado. */
export async function markFixedPending(uid: string, id: string): Promise<void> {
  await updateDoc(rawDoc(uid, id), {
    status: 'pending',
    allocatedAt: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Marca un fijo como pagado SIN crear movimiento ni tocar saldos. Útil para "ya estaba pagado"
 * (p.ej. al empezar a usar la app a mitad de mes, cuando los saldos ya están al día). No tiene
 * transactionId porque no hay movimiento asociado.
 */
export async function markFixedPaidWithoutTransaction(uid: string, id: string): Promise<void> {
  await updateDoc(rawDoc(uid, id), {
    status: 'paid',
    transactionId: null,
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Campos que se copian de la plantilla al snapshot mensual.
type MonthlySnapshot = Pick<
  FixedObligationMonthly,
  'name' | 'budgetedAmount' | 'categoryId' | 'payKind' | 'debtTargetId' | 'paymentMethod'
>;

/**
 * Propaga un cambio de la plantilla a los fijos de ESE mes que aún NO están pagados (§5.2):
 * actualiza sus snapshots (nombre, monto, categoría, medio…). Los pagados conservan su
 * registro histórico. Devuelve cuántos actualizó.
 */
export async function syncMonthlyToTemplate(
  uid: string,
  templateId: string,
  month: string,
  snapshot: MonthlySnapshot,
): Promise<number> {
  const snap = await getDocs(query(fixedMonthlyCol(uid), where('month', '==', month)));
  const targets = snap.docs.filter(
    (d) => d.data().templateId === templateId && d.data().status !== 'paid',
  );
  await Promise.all(
    targets.map((d) => updateDoc(rawDoc(uid, d.id), { ...snapshot, updatedAt: serverTimestamp() })),
  );
  return targets.length;
}

/**
 * Destinado/Pendiente → Pagado (§5.2, §5.3): crea la transacción real (que baja el saldo de
 * forma atómica) y enlaza el fijo con ella. Guarda el monto real y el medio usado.
 */
export async function payFixed(
  uid: string,
  fixed: FixedObligationMonthly,
  input: PayFixedInput,
): Promise<void> {
  const draft = buildTransactionFromFixed(fixed, {
    amount: input.amount,
    date: nowTimestamp(),
    paymentMethod: input.paymentMethod,
    debtTarget: input.debtTarget ?? null,
  });
  const transactionId = await createTransaction(uid, draft);

  await updateDoc(rawDoc(uid, fixed.id), {
    status: 'paid',
    paymentMethod: input.paymentMethod,
    transactionId,
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
