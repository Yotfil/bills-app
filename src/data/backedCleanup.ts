// Limpieza DESTRUCTIVA de los "fijos respaldados" antiguos (Opción C, PR2). Tras la migración no
// destructiva (los presupuestos ya viven como `Budget` de checklist), las plantillas/instancias
// `budgetBacked` quedaron dormidas. Aquí se borran de verdad — pero con RESPALDO para poder revertir:
// primero se COPIAN a colecciones de respaldo en el propio Firestore y luego se borran los originales.
// `restoreBackedFixed` las reescribe desde el respaldo si algo sale mal. No toca presupuestos ni los
// fijos que CONSUMEN un presupuesto (esos no son `budgetBacked`).
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  type CollectionReference,
} from 'firebase/firestore';
import { db } from './firebase';
import { docConverter, type Persisted } from './converters';
import { fixedMonthlyCol, fixedTemplatesCol } from './collections';
import type { BaseDoc, FixedObligationMonthly, FixedObligationTemplate } from '../domain/types';

const BACKUP = {
  templates: 'backedCleanupBackup_templates',
  monthly: 'backedCleanupBackup_monthly',
} as const;

function backupCol<T extends BaseDoc>(uid: string, name: string): CollectionReference<T, Persisted<T>> {
  if (!db) throw new Error('Firestore no está configurado.');
  return collection(db, 'users', uid, name).withConverter(docConverter<T>());
}

export interface BackedCleanupResult {
  templates: number;
  monthly: number;
}

/** Copia a respaldo y borra los respaldados dormidos. Devuelve cuántos movió. Idempotente: si no
 * quedan respaldados, devuelve 0. */
export async function cleanupBackedFixed(uid: string): Promise<BackedCleanupResult> {
  const tplBackup = backupCol<FixedObligationTemplate>(uid, BACKUP.templates);
  const mnBackup = backupCol<FixedObligationMonthly>(uid, BACKUP.monthly);

  const templates = (
    await getDocs(query(fixedTemplatesCol(uid), where('budgetBacked', '==', true)))
  ).docs.map((d) => d.data());
  const monthly = (
    await getDocs(query(fixedMonthlyCol(uid), where('budgetBacked', '==', true)))
  ).docs.map((d) => d.data());

  // 1) Respaldo (preserva el id en la clave del doc de respaldo).
  await Promise.all(templates.map((t) => setDoc(doc(tplBackup, t.id), t)));
  await Promise.all(monthly.map((m) => setDoc(doc(mnBackup, m.id), m)));

  // 2) Borrado de los originales (los respaldados nunca tienen movimiento asociado).
  await Promise.all(templates.map((t) => deleteDoc(doc(fixedTemplatesCol(uid), t.id))));
  await Promise.all(monthly.map((m) => deleteDoc(doc(fixedMonthlyCol(uid), m.id))));

  return { templates: templates.length, monthly: monthly.length };
}

/** Restaura desde el respaldo los respaldados borrados (rollback). Devuelve cuántos reescribió. */
export async function restoreBackedFixed(uid: string): Promise<BackedCleanupResult> {
  const tplBackup = backupCol<FixedObligationTemplate>(uid, BACKUP.templates);
  const mnBackup = backupCol<FixedObligationMonthly>(uid, BACKUP.monthly);

  const templates = (await getDocs(tplBackup)).docs.map((d) => d.data());
  const monthly = (await getDocs(mnBackup)).docs.map((d) => d.data());

  await Promise.all(templates.map((t) => setDoc(doc(fixedTemplatesCol(uid), t.id), t)));
  await Promise.all(monthly.map((m) => setDoc(doc(fixedMonthlyCol(uid), m.id), m)));

  return { templates: templates.length, monthly: monthly.length };
}
