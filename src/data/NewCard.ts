// Datos que recibe el repositorio para crear una tarjeta (CLAUDE.md §5.5).
export interface NewCard {
  name: string;
  creditLimit: number; // cupo total
  initialDebt: number; // deuda actual al registrarla (semilla)
  // Tarjeta mixta (gastos en divisa, 2026-07-07): divisa opcional en la que la tarjeta cobra y la
  // deuda inicial en esa divisa. Ausentes = tarjeta COP pura.
  foreignCurrency?: string | null;
  initialForeignDebt?: number;
  color?: string;
  icon?: string;
  sortOrder?: number;
}
