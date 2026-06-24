import type { BaseDoc } from './BaseDoc';
import type { Archivable } from './Archivable';
import type { EntityRef } from './EntityRef';

export type FixedPayKind = 'expense' | 'debt_payment';

export interface FixedObligationTemplate extends BaseDoc, Archivable {
  name: string; // concepto
  budgetedAmount: number;
  categoryId: string;
  defaultPaymentMethod: EntityRef; // cuenta o tarjeta por defecto
  payKind: FixedPayKind; // 'debt_payment' para abonos a tarjeta/crédito
  debtTargetId: string | null; // tarjeta/crédito destino si es abono
  active: boolean; // si entra en el rollover mensual
  sortOrder: number;
}
