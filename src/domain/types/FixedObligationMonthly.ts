import type { Timestamp } from 'firebase/firestore';
import type { BaseDoc } from './BaseDoc';
import type { EntityRef } from './EntityRef';
import type { FixedPayKind } from './FixedObligationTemplate';

export type FixedStatus = 'pending' | 'allocated' | 'paid'; // pendiente / destinado / pagado

export interface FixedObligationMonthly extends BaseDoc {
  month: string; // 'YYYY-MM'
  templateId: string;
  // SNAPSHOTS (no se reescriben si la plantilla cambia luego):
  name: string;
  budgetedAmount: number;
  categoryId: string;
  payKind: FixedPayKind;
  debtTargetId: string | null;
  budgetBacked: boolean; // snapshot: fijo respaldado por el presupuesto de su categoría (§5.9)
  // snapshot: fijo que CONSUME de un presupuesto (checklist que descuenta la bolsa; §5.9 ext.). No
  // suma aparte al total de fijos. Opcional: instancias previas a la feature no lo traen (= false).
  consumesBudget?: boolean;
  paymentMethod: EntityRef; // medio asignado este mes (editable)
  status: FixedStatus;
  // Monto REALMENTE pagado (§5.3): puede diferir del presupuestado (ej. Apple cobró 16.900
  // sobre 14.000). Se llena al pagar con movimiento; null si aún no se paga o si se marcó
  // "ya estaba pagado" sin monto. Para mostrar/sumar el pagado, usar `paidAmount ?? budgetedAmount`.
  paidAmount: number | null;
  transactionId: string | null; // se llena al marcar 'paid'
  allocatedAt: Timestamp | null;
  paidAt: Timestamp | null;
  // Día de cobro automático (snapshot de la plantilla, §5.3). null/ausente = sin auto.
  autoPayDay?: number | null;
  // Marca de que YA se auto-registró este mes. Persiste aunque se "Deshaga el pago", para que el
  // auto-registro NO vuelva a dispararse (el usuario re-registra a mano si el valor cambió). El próximo
  // mes nace sin esta marca.
  autoPaidAt?: Timestamp | null;
}
