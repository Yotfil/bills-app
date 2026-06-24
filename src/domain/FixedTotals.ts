// Totales de los fijos del mes para la pantalla de Fijos (CLAUDE.md §8.3).
export interface FixedTotals {
  pendingAmount: number; // falta por destinar
  allocatedAmount: number; // destinado sin pagar
  paidAmount: number; // ya pagado
  counts: {
    pending: number;
    allocated: number;
    paid: number;
    total: number;
  };
}
