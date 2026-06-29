import { useEffect, useRef } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { migrateBackedToBudgets } from '../../data/backedToBudgetMigration';

// Corre una sola vez la migración no destructiva de "fijos respaldados" → `Budget` de checklist
// (Opción C, §5.9). Idempotente; se guarda un flag por usuario en localStorage para no escanear en
// cada apertura. No renderiza nada. Se monta una vez en el layout.
const flagKey = (uid: string) => `backedToBudget-v1:${uid}`;

export function BackedToBudgetMigrationWatcher() {
  const uid = useSessionStore((s) => s.user?.uid);
  const attempted = useRef(false);

  useEffect(() => {
    if (!uid || attempted.current) return;
    if (localStorage.getItem(flagKey(uid))) return;
    attempted.current = true;
    void migrateBackedToBudgets(uid)
      .then(() => localStorage.setItem(flagKey(uid), '1'))
      .catch(() => {
        attempted.current = false; // reintenta en la próxima apertura si falló (p.ej. sin red)
      });
  }, [uid]);

  return null;
}
