import { useEffect } from 'react';
import { subscribeToAuth } from '../../data/authRepository';
import { isEmailAllowed } from '../../data/accessRepository';
import { ensureUserSettings } from '../../data/userRepository';
import { useSessionStore } from '../../store/sessionStore';

// Conecta Firebase Auth con el store de sesión (CLAUDE.md §3). Se monta una vez en la
// raíz: escucha los cambios de sesión y mantiene `sessionStore` al día.
//
// Early access: al autenticarse, verifica si el correo está en la allowlist. Solo si está
// aprobado se garantiza el doc raíz `users/{uid}` (sembrar datos a un usuario no aprobado
// fallaría por reglas). Si no, el acceso queda 'denied' y la app muestra "sin acceso".
export function useAuthSync(): void {
  const setUser = useSessionStore((s) => s.setUser);
  const setAccess = useSessionStore((s) => s.setAccess);
  const clearUser = useSessionStore((s) => s.clearUser);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      if (!user) {
        clearUser();
        return;
      }
      setUser(user); // status 'authenticated', access 'checking'
      void (async () => {
        const allowed = user.email ? await isEmailAllowed(user.email) : false;
        if (allowed) {
          setAccess('allowed');
          // No bloquea la UI; si falla (p.ej. sin red) Firestore reintenta al reconectar.
          void ensureUserSettings(user.uid);
        } else {
          setAccess('denied');
        }
      })();
    });
    return unsubscribe;
  }, [setUser, setAccess, clearUser]);
}
