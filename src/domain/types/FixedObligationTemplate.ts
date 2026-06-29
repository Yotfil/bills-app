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
  // Fijo que CONSUME de un presupuesto (caso "bolsa", §5.9 ext.): es un gasto normal de la categoría
  // de un presupuesto, pero como CHECKLIST que descuenta esa bolsa. NO suma aparte al total de fijos
  // (la cuota/presupuesto ya lo representa). Distinto de `budgetBacked` (ese fijo ES la bolsa); son
  // mutuamente excluyentes. Opcional: las plantillas previas no lo traen (se lee como false).
  consumesBudget?: boolean;
  active: boolean; // si entra en el rollover mensual
  sortOrder: number;
  // Día del mes (1–31) para auto-registrar el pago de este gasto fijo (§5.3). Al abrir la app ese día
  // (o después, dentro del mes) se crea el movimiento solo. null/ausente = sin auto. Aplica a gastos
  // y abonos a deuda; no a respaldados (esos no se pagan con movimiento).
  autoPayDay?: number | null;
  // Metadato del módulo de Suscripciones (§15): solo es relevante para fijos de la categoría
  // "Suscripciones". El usuario lo marca para señalar suscripciones que está pensando cancelar.
  // Opcional: los fijos creados antes de este feature no lo traen (se lee como false).
  cancelCandidate?: boolean;
}
