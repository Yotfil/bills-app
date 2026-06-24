import type { EntityRef } from '../domain/types';

// Datos al pagar una obligación fija desde la pantalla de Fijos (CLAUDE.md §5.3).
export interface PayFixedInput {
  amount: number; // monto real (prellenado con budgetedAmount, editable)
  paymentMethod: EntityRef; // de qué cuenta/tarjeta sale (editable este mes)
  debtTarget?: EntityRef | null; // destino del abono si payKind = debt_payment
}
