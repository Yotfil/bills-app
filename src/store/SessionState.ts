import type { SessionUser } from './SessionUser';

/** Estado de carga de la sesión: mientras `loading`, aún no sabemos si hay usuario. */
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionState {
  user: SessionUser | null;
  status: SessionStatus;
  setUser: (user: SessionUser) => void;
  clearUser: () => void;
}
