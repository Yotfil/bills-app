import { useEffect, useState } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { subscribeUserSettings } from '../../data/userRepository';
import type { UserSettings } from '../../domain/types';

// Lee los ajustes del usuario en tiempo real (incluye onboardingCompleted, §7). `loading`
// es true hasta la primera respuesta; `settings` es null si el doc aún no existe.
export function useUserSettings(): { settings: UserSettings | null; loading: boolean } {
  const uid = useSessionStore((s) => s.user?.uid);
  const access = useSessionStore((s) => s.access);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Solo nos suscribimos si el usuario está aprobado (early access): leer users/{uid} de un
    // usuario no aprobado lo niegan las reglas, así que ni lo intentamos.
    if (!uid || access !== 'allowed') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const unsubscribe = subscribeUserSettings(uid, (s) => {
      setSettings(s);
      setLoading(false);
    });
    return unsubscribe;
  }, [uid, access]);

  return { settings, loading };
}
