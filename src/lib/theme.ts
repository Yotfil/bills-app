import type { ThemeOption } from './ThemeOption';

export type { Theme, ThemeOption } from './ThemeOption';

// Catálogo de temas para el selector. Los `swatch` solo alimentan la vista previa del picker;
// el cambio real de colores ocurre al poner `data-theme` en <html> (src/index.css).
export const THEMES: ThemeOption[] = [
  { id: 'current', label: 'Actual', swatch: { bg: '#f8fafc', brand: 'rgb(26 60 59)' } },
  { id: 'dark', label: 'Oscuro', swatch: { bg: '#0b1220', brand: '#f1f5f9' } },
  { id: 'girly', label: 'Rosa', swatch: { bg: '#fdf2f8', brand: '#db2777' } },
  { id: 'blue', label: 'Azul', swatch: { bg: '#eff6ff', brand: '#2563eb' } },
  { id: 'green', label: 'Verde', swatch: { bg: '#ecfdf5', brand: '#059669' } },
];
