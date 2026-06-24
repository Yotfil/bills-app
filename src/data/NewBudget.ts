// Datos para crear un presupuesto por categoría (CLAUDE.md §5.9).
export interface NewBudget {
  categoryId: string;
  monthlyLimit: number; // tope mensual
  active?: boolean;
}
