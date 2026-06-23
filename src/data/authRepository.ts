// Capa de datos: autenticación (CLAUDE.md §3, §13.3).
// Envuelve Firebase Auth y traduce su `User` al modelo de la app (`SessionUser`).
// La UI y los stores NUNCA importan Firebase Auth directamente: pasan por aquí.
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import type { SessionUser } from '../store/sessionStore';

/** Traduce el `User` de Firebase al usuario de dominio que conoce la app. */
function toSessionUser(user: User): SessionUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

/** Devuelve la instancia de Auth o lanza un error claro si Firebase no está configurado. */
function requireAuth() {
  if (!auth) {
    throw new Error('Firebase no está configurado. Define las claves en .env.local.');
  }
  return auth;
}

const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<SessionUser> {
  const cred = await signInWithPopup(requireAuth(), googleProvider);
  return toSessionUser(cred.user);
}

export async function loginWithEmail(email: string, password: string): Promise<SessionUser> {
  const cred = await signInWithEmailAndPassword(requireAuth(), email, password);
  return toSessionUser(cred.user);
}

export async function registerWithEmail(email: string, password: string): Promise<SessionUser> {
  const cred = await createUserWithEmailAndPassword(requireAuth(), email, password);
  return toSessionUser(cred.user);
}

export async function logout(): Promise<void> {
  await fbSignOut(requireAuth());
}

/**
 * Se suscribe a los cambios de sesión de Firebase. Llama a `onUser` con el usuario
 * (mapeado) o `null` cuando no hay sesión. Devuelve la función para desuscribirse.
 *
 * Si Firebase no está configurado, resuelve a "sin sesión" para que la app renderice
 * (se ve el login) en lugar de quedarse colgada en "Cargando…".
 */
export function subscribeToAuth(onUser: (user: SessionUser | null) => void): () => void {
  if (!auth) {
    onUser(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    onUser(user ? toSessionUser(user) : null);
  });
}
