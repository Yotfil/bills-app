// Datos que recibe el repositorio para crear una tarjeta (CLAUDE.md §5.5).
export interface NewCard {
  name: string;
  creditLimit: number; // cupo total
  initialDebt: number; // deuda actual al registrarla (semilla)
  color?: string;
  icon?: string;
  sortOrder?: number;
}
