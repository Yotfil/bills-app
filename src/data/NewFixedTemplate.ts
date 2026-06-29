import type { EntityRef, FixedPayKind } from '../domain/types';

// Datos para crear una plantilla de obligación fija (CLAUDE.md §5.2, §10).
export interface NewFixedTemplate {
  name: string;
  budgetedAmount: number;
  categoryId: string;
  defaultPaymentMethod: EntityRef; // cuenta o tarjeta por defecto
  payKind: FixedPayKind; // 'debt_payment' para abonos a tarjeta/crédito
  debtTargetId: string | null; // tarjeta/crédito destino si es abono
  budgetBacked?: boolean; // respaldado por el presupuesto de su categoría (§5.9)
  consumesBudget?: boolean; // consume de un presupuesto (checklist que descuenta la bolsa)
  autoPayDay?: number | null; // día del mes para auto-registrar el pago (§5.3)
  active?: boolean;
  sortOrder?: number;
}
