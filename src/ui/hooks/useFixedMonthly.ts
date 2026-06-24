import { useEffect, useState } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { subscribeFixedMonthly } from '../../data/fixedMonthlyRepository';
import type { FixedObligationMonthly } from '../../domain/types';

// Suscribe a los fijos de un mes concreto (CLAUDE.md §8.3) en tiempo real. Re-suscribe al
// cambiar de mes o de usuario. El reservado y los totales se derivan de estos datos.
export function useFixedMonthly(month: string): {
  items: FixedObligationMonthly[];
  loading: boolean;
} {
  const uid = useSessionStore((s) => s.user?.uid);
  const [items, setItems] = useState<FixedObligationMonthly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    // Reset al cambiar de mes/usuario hasta que llegue la primera data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const unsubscribe = subscribeFixedMonthly(uid, month, (data) => {
      setItems(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid, month]);

  return { items, loading };
}
