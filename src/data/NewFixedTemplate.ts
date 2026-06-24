import type { EntityRef, FixedPayKind } from '../domain/types';

// Datos para crear una plantilla de obligación fija (CLAUDE.md §5.2, §10).
export interface NewFixedTemplate {
  name: string;
  budgetedAmount: number;
  categoryId: string;
  defaultPaymentMethod: EntityRef; // cuenta o tarjeta por defecto
  payKind: FixedPayKind; // 'debt_payment' para abonos a tarjeta/crédito
  debtTargetId: string | null; // tarjeta/crédito destino si es abono
  active?: boolean;
  sortOrder?: number;
}
