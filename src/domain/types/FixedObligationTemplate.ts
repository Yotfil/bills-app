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
  // Fijo "respaldado por presupuesto" (§5.9): no se paga con movimiento; se marca lleno solo cuando
  // el presupuesto de su categoría llega a 0. Su valor va en espejo con el tope del presupuesto.
  // Solo aplica a payKind 'expense' y a categorías que YA tienen presupuesto.
  budgetBacked: boolean;
  active: boolean; // si entra en el rollover mensual
  sortOrder: number;
  // Metadato del módulo de Suscripciones (§15): solo es relevante para fijos de la categoría
  // "Suscripciones". El usuario lo marca para señalar suscripciones que está pensando cancelar.
  // Opcional: los fijos creados antes de este feature no lo traen (se lee como false).
  cancelCandidate?: boolean;
}
