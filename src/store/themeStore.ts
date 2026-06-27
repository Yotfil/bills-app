import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeState } from './ThemeState';
import type { Theme } from '../lib/theme';

// Aplica el tema poniendo data-theme en <html>; los overrides de tokens viven en src/index.css.
function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'current',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'theme',
      // Tras rehidratar desde localStorage, reaplica el tema guardado al DOM.
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

// Aplica el tema persistido en cuanto se carga el módulo (persist rehidrata síncrono con
// localStorage), para evitar parpadeo del tema por defecto antes de montar React.
applyTheme(useThemeStore.getState().theme);
