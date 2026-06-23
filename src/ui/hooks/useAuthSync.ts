import { useEffect } from 'react';
import { subscribeToAuth } from '../../data/authRepository';
import { ensureUserSettings } from '../../data/userRepository';
import { useSessionStore } from '../../store/sessionStore';

// Conecta Firebase Auth con el store de sesión (CLAUDE.md §3). Se monta una vez en la
// raíz: escucha los cambios de sesión y mantiene `sessionStore` al día. Al detectar un
// usuario, garantiza que exista su documento raíz `users/{uid}`.
export function useAuthSync(): void {
  const setUser = useSessionStore((s) => s.setUser);
  const clearUser = useSessionStore((s) => s.clearUser);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      if (user) {
        setUser(user);
        // No bloquea la UI; si falla (p.ej. sin red) Firestore reintenta al reconectar.
        void ensureUserSettings(user.uid);
      } else {
        clearUser();
      }
    });
    return unsubscribe;
  }, [setUser, clearUser]);
}
