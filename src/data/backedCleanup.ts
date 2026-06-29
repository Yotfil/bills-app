// Limpieza DESTRUCTIVA de los "fijos respaldados" antiguos (Opción C, PR2). Tras la migración no
// destructiva (los presupuestos ya viven como `Budget` de checklist), las plantillas/instancias
// `budgetBacked` quedaron dormidas. Aquí se borran de verdad — pero con RESPALDO para poder revertir.
//
// El respaldo se guarda como un CAMPO del doc del usuario (`users/{uid}.backedCleanupBackup`), no en
// una colección aparte: las reglas de Firestore solo permiten las subcolecciones conocidas, así que
// una colección nueva sería denegada. El doc del usuario sí tiene permiso (canAccess). Los datos son
// pocos (cabe de sobra en el límite de 1 MB del documento). `restoreBackedFixed` los reescribe.
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { fixedMonthlyCol, fixedTemplatesCol } from './collections';
import type { FixedObligationMonthly, FixedObligationTemplate } from '../domain/types';

export interface BackedCleanupResult {
  templates: number;
  monthly: number;
}

function userRef(uid: string) {
  if (!db) throw new Error('Firestore no está configurado.');
  return doc(db, 'users', uid);
}

/** Copia los respaldados dormidos al doc del usuario y borra los originales. Idempotente. */
export async function cleanupBackedFixed(uid: string): Promise<BackedCleanupResult> {
  const templates = (
    await getDocs(query(fixedTemplatesCol(uid), where('budgetBacked', '==', true)))
  ).docs.map((d) => d.data());
  const monthly = (
    await getDocs(query(fixedMonthlyCol(uid), where('budgetBacked', '==', true)))
  ).docs.map((d) => d.data());

  // 1) Respaldo en el doc del usuario (preserva el objeto completo, incluido su id).
  await updateDoc(userRef(uid), {
    backedCleanupBackup: { templates, monthly, at: serverTimestamp() },
  });

  // 2) Borrado de los originales (los respaldados nunca tienen movimiento asociado).
  await Promise.all(templates.map((t) => deleteDoc(doc(fixedTemplatesCol(uid), t.id))));
  await Promise.all(monthly.map((m) => deleteDoc(doc(fixedMonthlyCol(uid), m.id))));

  return { templates: templates.length, monthly: monthly.length };
}

/** Rollback: reescribe los respaldados desde el respaldo guardado en el doc del usuario. */
export async function restoreBackedFixed(uid: string): Promise<BackedCleanupResult> {
  const snap = await getDoc(userRef(uid));
  const backup = snap.data()?.backedCleanupBackup as
    | { templates?: FixedObligationTemplate[]; monthly?: FixedObligationMonthly[] }
    | undefined;
  const templates = backup?.templates ?? [];
  const monthly = backup?.monthly ?? [];

  // setDoc con el converter ignora `id` al escribir y usa el id original como clave del doc.
  await Promise.all(templates.map((t) => setDoc(doc(fixedTemplatesCol(uid), t.id), t)));
  await Promise.all(monthly.map((m) => setDoc(doc(fixedMonthlyCol(uid), m.id), m)));

  return { templates: templates.length, monthly: monthly.length };
}
