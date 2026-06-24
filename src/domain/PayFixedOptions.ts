import type { Timestamp } from 'firebase/firestore';
import type { EntityRef } from './types';

// Opciones al pagar una obligación fija (CLAUDE.md §5.3).
export interface PayFixedOptions {
  /** Monto real al pagar; se prellena con budgetedAmount pero es editable (§5.3). */
  amount: number;
  date: Timestamp;
  /** De qué cuenta/tarjeta sale (origen). Por defecto, el medio asignado al fijo. */
  paymentMethod: EntityRef;
  /** Destino del abono cuando payKind = 'debt_payment' (tarjeta o crédito). */
  debtTarget?: EntityRef | null;
}
