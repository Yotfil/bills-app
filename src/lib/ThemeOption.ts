// Temas de color de la app. "current" (verde Mis Luks) es el de fábrica; el resto re-tiñe
// tokens de Tailwind vía [data-theme] en <html> (ver src/index.css). El tipo alias va junto a
// su interfaz relacionada (convención §13.2.1).
export type Theme = 'current' | 'dark' | 'girly' | 'blue' | 'green';

export interface ThemeOption {
  id: Theme;
  label: string;
  // Colores de la muestra (swatch) en el selector: fondo de página + color de marca.
  swatch: { bg: string; brand: string };
}
