// Resumen del mes para el dashboard (CLAUDE.md §8.1): Ingresos | Gastos | Flujo.
export interface MonthlySummary {
  income: number; // Σ ingresos del periodo
  expense: number; // Σ gastos reales del periodo (solo expense, §5.4)
  flow: number; // income − expense (positivo = ahorra; negativo = gasta de más)
}
