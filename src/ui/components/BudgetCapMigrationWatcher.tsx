import { useEffect, useRef } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { migrateBudgetCapsToBudgets } from '../../data/budgetCapMigration';

// Corre una sola vez la migración del tope respaldado al `Budget` (Opción B, §5.9). Idempotente, pero
// se guarda un flag por usuario en localStorage para no escanear la colección en cada apertura. No
// renderiza nada. Se monta una vez en el layout.
const flagKey = (uid: string) => `budgetCapMigrated-v1:${uid}`;

export function BudgetCapMigrationWatcher() {
  const uid = useSessionStore((s) => s.user?.uid);
  const attempted = useRef(false);

  useEffect(() => {
    if (!uid || attempted.current) return;
    if (localStorage.getItem(flagKey(uid))) return;
    attempted.current = true;
    void migrateBudgetCapsToBudgets(uid)
      .then(() => localStorage.setItem(flagKey(uid), '1'))
      .catch(() => {
        // Si falla (p.ej. sin red), se reintenta en la próxima apertura: no se marca el flag.
        attempted.current = false;
      });
  }, [uid]);

  return null;
}
