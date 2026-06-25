// Métricas de un mes para los reportes de tendencias (CLAUDE.md §15). Los gastos siguen la
// regla de oro (§5.4): solo `expense`; transferencias/abonos/ajustes nunca cuentan.
export interface MonthlyInsight {
  month: string; // 'YYYY-MM'
  income: number; // Σ ingresos del mes
  expense: number; // Σ gasto real del mes
  hormiga: number; // Σ gasto con etiqueta 'hormiga' del mes (§5.8)
}
