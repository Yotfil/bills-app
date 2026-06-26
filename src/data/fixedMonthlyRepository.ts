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
import { create, hardDelete, listAll } from './crud';
import { createTransaction, deleteTransaction } from './transactionService';
import { generateMonthlyFixeds } from '../domain/rollover';
import { buildTransactionFromFixed } from '../domain/fixed';
import { nowTimestamp } from '../lib/date';
import type { PayFixedInput } from './PayFixedInput';
import type { FixedObligationMonthly, FixedObligationTemplate } from '../domain/types';

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

/** Lee de una sola vez los fijos de un mes (sin suscripción). Útil en orquestaciones. */
export async function listFixedMonthlyForMonth(
  uid: string,
  month: string,
): Promise<FixedObligationMonthly[]> {
  const snap = await getDocs(query(fixedMonthlyCol(uid), where('month', '==', month)));
  return snap.docs.map((d) => d.data());
}

/**
 * Sincroniza SOLO el monto de los fijos del mes (no pagados) de una plantilla, sin tocar el
 * resto del snapshot (medio de pago, categoría…). Lo usa el vínculo crédito↔cuota cuando cambia
 * el valor de la cuota (§5.6). Devuelve cuántos actualizó.
 */
export async function syncMonthlyAmount(
  uid: string,
  templateId: string,
  month: string,
  amount: number,
): Promise<number> {
  const snap = await getDocs(query(fixedMonthlyCol(uid), where('month', '==', month)));
  const targets = snap.docs.filter(
    (d) => d.data().templateId === templateId && d.data().status !== 'paid',
  );
  await Promise.all(
    targets.map((d) =>
      updateDoc(rawDoc(uid, d.id), { budgetedAmount: amount, updatedAt: serverTimestamp() }),
    ),
  );
  return targets.length;
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
 * Agrega al mes los fijos de las plantillas dadas (sincronización plantilla→mes, §5.10). Se usa
 * cuando se crearon plantillas DESPUÉS de generar el mes y el usuario decide sumarlas. Reusa la
 * función pura `generateMonthlyFixeds` (que ya filtra activas/no archivadas). Devuelve cuántos creó.
 */
export async function addFixedMonthlyFromTemplates(
  uid: string,
  month: string,
  templates: FixedObligationTemplate[],
): Promise<number> {
  const drafts = generateMonthlyFixeds(templates, month, []);
  await Promise.all(drafts.map((draft) => create(fixedMonthlyCol(uid), draft)));
  return drafts.length;
}

/**
 * Reescribe el snapshot de UN fijo del mes con los valores actuales de su plantilla (§5.2): nombre,
 * monto, categoría, tipo, deuda destino y medio por defecto. Lo usa la sincronización plantilla→mes
 * al "Actualizar" un fijo desfasado. No valida estado: la UI solo lo ofrece para fijos no pagados.
 */
export async function updateMonthlyFromTemplate(
  uid: string,
  fixedId: string,
  template: FixedObligationTemplate,
): Promise<void> {
  await updateDoc(rawDoc(uid, fixedId), {
    name: template.name,
    budgetedAmount: template.budgetedAmount,
    categoryId: template.categoryId,
    payKind: template.payKind,
    debtTargetId: template.debtTargetId,
    paymentMethod: template.defaultPaymentMethod,
    updatedAt: serverTimestamp(),
  });
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
    paidAmount: null, // sin monto real: se muestra/suma el presupuestado (§5.3)
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
    paidAmount: input.amount, // monto REAL pagado (§5.3): puede diferir del presupuestado
    transactionId,
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Elimina la instancia mensual de un fijo (lo quita del checklist del mes). Si el fijo había
 * creado un movimiento al pagarse, primero lo elimina: eso REVIERTE su efecto en los saldos
 * (§9.3), para no dejar un movimiento huérfano. No toca la plantilla (el molde sigue), así que
 * el fijo puede volver a generarse el próximo mes (o regenerarse este con "Generar fijos").
 */
export async function deleteFixedMonthly(
  uid: string,
  fixed: FixedObligationMonthly,
): Promise<void> {
  if (fixed.transactionId) {
    await deleteTransaction(uid, fixed.transactionId);
  }
  await hardDelete(fixedMonthlyCol(uid), fixed.id);
}

/**
 * Deshace el pago de un fijo (Pagado → Pendiente). Si el pago creó un movimiento, lo elimina:
 * eso DEVUELVE el dinero a la cuenta de origen (revierte el efecto en los saldos, §9.3). Si se
 * marcó con "Ya estaba pagado" (sin movimiento), no hay nada que devolver.
 */
export async function revertFixedPayment(
  uid: string,
  fixed: FixedObligationMonthly,
): Promise<void> {
  if (fixed.transactionId) {
    await deleteTransaction(uid, fixed.transactionId);
  }
  await updateDoc(rawDoc(uid, fixed.id), {
    status: 'pending',
    paidAmount: null, // al volver a pendiente se olvida el monto real previo
    transactionId: null,
    paidAt: null,
    updatedAt: serverTimestamp(),
  });
}
