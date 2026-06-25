import type { SessionUser } from './SessionUser';

/** Estado de carga de la sesión: mientras `loading`, aún no sabemos si hay usuario. */
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Acceso del usuario autenticado (early access, allowlist por correo):
 *   - 'unknown'  → sin sesión todavía
 *   - 'checking' → autenticado, verificando si su correo está aprobado
 *   - 'allowed'  → aprobado: puede usar la app
 *   - 'denied'   → no aprobado: se le muestra la pantalla de "sin acceso"
 */
export type AccessStatus = 'unknown' | 'checking' | 'allowed' | 'denied';

export interface SessionState {
  user: SessionUser | null;
  status: SessionStatus;
  access: AccessStatus;
  setUser: (user: SessionUser) => void;
  setAccess: (access: AccessStatus) => void;
  clearUser: () => void;
}
