// Datos para crear una categoría (CLAUDE.md §6, §8.4). Las del usuario nacen no-sistema y SÍ
// cuentan en reportes de gasto; la de sistema "Ajuste" se siembra aparte (no se crea desde aquí).
export interface NewCategory {
  name: string;
  icon: string; // emoji
  color: string; // hex, p.ej. '#22c55e'
  sortOrder?: number; // por defecto al final de la lista
}
