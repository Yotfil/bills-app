// Un ítem del menú de administración "Más" (CLAUDE.md §8.4).
export interface MenuItem {
  to: string;
  label: string;
  hint: string;
  ready: boolean; // false = aún no construido (se muestra como "Próximamente")
}
