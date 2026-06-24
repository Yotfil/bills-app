import type { Timestamp } from 'firebase/firestore';
import type { EntityRef, TransactionType } from './types';

// Intención del usuario en el formulario de captura (CLAUDE.md §5.4). La adjustment nace en
// la reconciliación (§5.7), por eso se excluye aquí.
export interface ManualEntryInput {
  type: Exclude<TransactionType, 'adjustment'>;
  amount: number;
  date: Timestamp;
  concept: string;
  categoryId: string | null; // requerido en expense
  source: EntityRef | null; // cuenta/tarjeta de origen
  destination: EntityRef | null; // cuenta destino (transfer) o deuda (debt_payment)
  hormiga?: boolean; // etiqueta transversal de gasto hormiga (§5.8)
  note?: string | null;
}
