// Fila editable de "aumentar un presupuesto" desde un ingreso (§5.9). Es el estado del form
// (montos como string mientras se escriben); al guardar se convierte en Transaction.budgetBoosts.
export interface BoostRow {
  budgetId: string;
  month: string; // 'YYYY-MM'
  amount: string;
}
