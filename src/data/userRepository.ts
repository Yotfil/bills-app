// Capa de datos: documento raíz del usuario `users/{uid}` (CLAUDE.md §9.2).
// Crea los ajustes por defecto la primera vez que alguien inicia sesión, para que toda
// la estructura del usuario cuelgue de aquí (multiusuario desde la base, §13.3).
//
// NOTA: cuando exista la capa de converters (Paso 5) y el tipo de dominio UserSettings
// (Paso 4, §9.1), esta escritura se moverá detrás de un converter `withConverter`. Por
// ahora escribe los campos directamente para no bloquear el login.
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { seedBaseCategories } from './categoryRepository';
import type { UserSettings } from '../domain/types';

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Garantiza que exista `users/{uid}` con los ajustes por defecto y el set base de
 * categorías (§7). Idempotente: si el documento ya existe, no lo toca.
 */
export async function ensureUserSettings(uid: string): Promise<void> {
  if (!db) return; // Firebase no configurado: nada que sembrar todavía.
  const ref = doc(db, 'users', uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      currency: 'COP',
      locale: 'es-CO',
      onboardingCompleted: false,
      hormigaMonthlyCap: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Sembrar el set base SIEMPRE, no solo cuando se crea el doc del usuario (§6, §7).
  // seedBaseCategories es idempotente (no duplica si ya existen), pero antes solo se llamaba
  // en el primer login: una cuenta que perdiera sus categorías (p.ej. tras una limpieza de
  // datos que borró las categorías pero dejó `users/{uid}`) quedaba atrapada sin ellas y la
  // plantilla sugerida no podía crear nada. Llamarla siempre la hace auto-reparable.
  await seedBaseCategories(uid);
}

/** Se suscribe a los ajustes del usuario (incluye onboardingCompleted). null si no existe. */
export function subscribeUserSettings(
  uid: string,
  onChange: (settings: UserSettings | null) => void,
): () => void {
  if (!db) {
    onChange(null);
    return () => {};
  }
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    onChange(snap.exists() ? (snap.data() as UserSettings) : null);
  });
}

/** Marca el onboarding como completado (§7), para no volver a mostrarlo. */
export async function completeOnboarding(uid: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'users', uid), {
    onboardingCompleted: true,
    updatedAt: serverTimestamp(),
  });
}

/** Guarda (o borra, con null) el tope mensual de gasto hormiga del usuario (§5.8). */
export async function setHormigaCap(uid: string, value: number | null): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'users', uid), {
    hormigaMonthlyCap: value,
    updatedAt: serverTimestamp(),
  });
}
