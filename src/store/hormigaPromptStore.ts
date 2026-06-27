import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HormigaPromptState } from './HormigaPromptState';

// Descarte del nudge de tope de gasto hormiga (§5.8), persistido en localStorage para no insistir.
export const useHormigaPromptStore = create<HormigaPromptState>()(
  persist(
    (set) => ({
      dismissed: false,
      dismiss: () => set({ dismissed: true }),
    }),
    { name: 'hormiga-prompt' },
  ),
);
