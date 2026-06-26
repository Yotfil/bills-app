// Color de las barras de progreso de presupuesto/tope (CLAUDE.md §5.9). Umbrales compartidos por la
// tarjeta de presupuesto y el fijo respaldado para que se vean igual: verde con margen, naranja al
// pasar el 70%, rojo al pasar el 90% (y al exceder). Devuelve una clase de Tailwind.
export function progressBarColor(ratio: number): string {
  if (ratio > 0.9) return 'bg-red-500';
  if (ratio > 0.7) return 'bg-orange-500';
  return 'bg-emerald-500';
}
