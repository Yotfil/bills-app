export interface HormigaCardProps {
  /** Gasto hormiga del MES EN CURSO. */
  currentHormiga: number;
  /** Tope sugerido por la app (promedio de los meses más bajos), o null si no hay base. */
  suggestedCap: number | null;
}
