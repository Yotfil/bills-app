/**
 * Aumento de un presupuesto ligado a un ingreso (§5.9): parte del ingreso se asigna a subir el tope
 * de un presupuesto en un mes concreto (p.ej. 200.000 del ingreso de la hermana → tope de Mamá en
 * julio). Vive en `Transaction.budgetBoosts`; el monto se hornea en `Budget.monthlyOverrides[month]`
 * al crear el ingreso y se revierte al borrarlo/editarlo (queda LIGADO al ingreso).
 */
export interface BudgetBoost {
  budgetId: string;
  month: string; // 'YYYY-MM'
  amount: number; // entero COP > 0
}
