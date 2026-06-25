import { create } from 'zustand';
import type { SessionState } from './SessionState';

// Store de SESIÓN (estado de cliente con Zustand, CLAUDE.md §3, §13.3).
//
// Patrón de referencia para los demás stores:
//   - Guarda estado de UI/cliente, NO reglas de negocio (esas viven en `domain/`).
//   - Las acciones orquestan; no calculan saldos ni estados a mano.
//   - Tipado estricto, sin `any`.
//
// En el Paso 3 (login) este store se "alimenta" desde Firebase Auth: un listener de
// `onAuthStateChanged` llama a `setUser` / `clearUser`. Aquí no se importa Firebase a
// propósito, para que el estado de sesión sea testeable sin Firebase.

// Re-exporta el tipo del usuario de sesión para quien lo necesite (p.ej. authRepository).
export type { SessionUser } from './SessionUser';

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  // Arranca en 'loading': la UI muestra un spinner hasta que Auth resuelva (Paso 3).
  status: 'loading',
  access: 'unknown',
  // Al autenticarse, el acceso pasa a 'checking' hasta confirmar la allowlist (useAuthSync).
  setUser: (user) => set({ user, status: 'authenticated', access: 'checking' }),
  setAccess: (access) => set({ access }),
  clearUser: () => set({ user: null, status: 'unauthenticated', access: 'unknown' }),
}));
