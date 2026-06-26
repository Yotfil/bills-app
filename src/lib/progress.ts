// Color de las barras de progreso de presupuesto/tope (CLAUDE.md §5.9). Umbrales compartidos por la
// tarjeta de presupuesto y el fijo respaldado para que se vean igual: verde con margen, naranja al
// pasar el 60%, rojo al pasar el 80% (y al exceder). Devuelve una clase de Tailwind.
export const NEAR_LIMIT_RATIO = 0.8; // "muy cerca de exceder" (alerta del dashboard)

export function progressBarColor(ratio: number): string {
  if (ratio > NEAR_LIMIT_RATIO) return 'bg-red-500';
  if (ratio > 0.6) return 'bg-orange-500';
  return 'bg-emerald-500';
}
