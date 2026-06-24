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
  paymentMethod: EntityRef; // medio asignado este mes (editable)
  status: FixedStatus;
  transactionId: string | null; // se llena al marcar 'paid'
  allocatedAt: Timestamp | null;
  paidAt: Timestamp | null;
}
