import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EntryPrefsState } from './EntryPrefsState';

// Preferencias de captura (CLAUDE.md §5.4). Se persisten en localStorage para que sobrevivan
// recargas. Es estado de cliente puro (no toca reglas de negocio).
export const useEntryPrefsStore = create<EntryPrefsState>()(
  persist(
    (set) => ({
      lastSource: null,
      lastType: 'expense', // el formulario abre por defecto en gasto (§5.4)
      remember: (type, source) => set({ lastType: type, lastSource: source }),
    }),
    { name: 'entry-prefs' },
  ),
);
