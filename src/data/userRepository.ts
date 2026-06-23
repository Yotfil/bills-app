// Capa de datos: documento raíz del usuario `users/{uid}` (CLAUDE.md §9.2).
// Crea los ajustes por defecto la primera vez que alguien inicia sesión, para que toda
// la estructura del usuario cuelgue de aquí (multiusuario desde la base, §13.3).
//
// NOTA: cuando exista la capa de converters (Paso 5) y el tipo de dominio UserSettings
// (Paso 4, §9.1), esta escritura se moverá detrás de un converter `withConverter`. Por
// ahora escribe los campos directamente para no bloquear el login.
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Garantiza que exista `users/{uid}` con los ajustes por defecto. Idempotente: si el
 * documento ya existe, no lo toca.
 */
export async function ensureUserSettings(uid: string): Promise<void> {
  if (!db) return; // Firebase no configurado: nada que sembrar todavía.
  const ref = doc(db, 'users', uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;

  await setDoc(ref, {
    currency: 'COP',
    locale: 'es-CO',
    onboardingCompleted: false,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
