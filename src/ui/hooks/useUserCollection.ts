import { useEffect, useState } from 'react';
import { useSessionStore } from '../../store/sessionStore';

// Hook genérico para leer una colección del usuario en TIEMPO REAL (CLAUDE.md §3).
// Recibe una función de suscripción del repositorio (estable, a nivel de módulo) y entrega
// los items vivos más un flag de carga. Se desuscribe al desmontar o cambiar de usuario.
export function useUserCollection<T>(
  subscribe: (uid: string, onChange: (items: T[]) => void) => () => void,
): { items: T[]; loading: boolean } {
  const uid = useSessionStore((s) => s.user?.uid);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    // Al cambiar de usuario volvemos a "cargando" hasta que llegue la primera data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const unsubscribe = subscribe(uid, (data) => {
      setItems(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid, subscribe]);

  return { items, loading };
}
