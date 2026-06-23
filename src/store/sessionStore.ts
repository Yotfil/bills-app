import { create } from 'zustand';

// Store de SESIÓN (estado de cliente con Zustand, CLAUDE.md §3, §13.3).
//
// Patrón de referencia para los demás stores:
//   - Guarda estado de UI/cliente, NO reglas de negocio (esas viven en `domain/`).
//   - Las acciones orquestan; no calculan saldos ni estados a mano.
//   - Tipado estricto, sin `any`.
//
// En el Paso 3 (login) este store se "alimenta" desde Firebase Auth: un listener de
// `onAuthStateChanged` llamará a `setUser` / `clearUser`. Aquí no se importa Firebase a
// propósito, para que el estado de sesión sea testeable sin Firebase.

/** Usuario autenticado, en términos del dominio de la app (no el objeto de Firebase). */
export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/** Estado de carga de la sesión: mientras `loading`, aún no sabemos si hay usuario. */
type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionState {
  user: SessionUser | null;
  status: SessionStatus;
  setUser: (user: SessionUser) => void;
  clearUser: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  // Arranca en 'loading': la UI muestra un spinner hasta que Auth resuelva (Paso 3).
  status: 'loading',
  setUser: (user) => set({ user, status: 'authenticated' }),
  clearUser: () => set({ user: null, status: 'unauthenticated' }),
}));
