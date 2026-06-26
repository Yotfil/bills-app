import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FixedSyncState } from './FixedSyncState';

// Descarte por mes del banner de sincronización plantilla→fijos (§5.10). Persistido en localStorage
// para que sobreviva recargas: si el usuario cierra el banner de un mes, al volver ve solo el icono.
export const useFixedSyncStore = create<FixedSyncState>()(
  persist(
    (set) => ({
      dismissedMonths: {},
      dismiss: (month) =>
        set((s) => ({ dismissedMonths: { ...s.dismissedMonths, [month]: true } })),
      undismiss: (month) =>
        set((s) => {
          if (!s.dismissedMonths[month]) return s;
          const next = { ...s.dismissedMonths };
          delete next[month];
          return { dismissedMonths: next };
        }),
    }),
    { name: 'fixed-sync-dismissed' },
  ),
);
