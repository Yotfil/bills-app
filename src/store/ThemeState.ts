import type { Theme } from '../lib/theme';

// Preferencia de tema de color (cliente puro, persistida en localStorage). No toca reglas de
// negocio: solo cambia el atributo data-theme de <html> para re-teñir los tokens de Tailwind.
export interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}
