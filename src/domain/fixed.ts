// Obligaciones fijas: máquina de estados y conexión fijo→registro (CLAUDE.md §5.2, §5.3).
// Lógica pura: decide transiciones válidas y construye la transacción que se crea al pagar.
// Los timestamps (allocatedAt/paidAt, date) los pone la capa de datos; aquí se reciben.
import type { FixedObligationMonthly, FixedStatus, TransactionDraft } from './types';
import type { PayFixedOptions } from './PayFixedOptions';

export type { PayFixedOptions } from './PayFixedOptions';

// Transiciones permitidas (§5.2): pendiente→destinado, destinado→pagado, y el atajo
// pendiente→pagado directo. No se permite "deshacer" hacia atrás desde aquí (editar un
// pago se maneja como edición/eliminación de la transacción).
const ALLOWED_TRANSITIONS: Record<FixedStatus, FixedStatus[]> = {
  pending: ['allocated', 'paid'],
  allocated: ['paid'],
  paid: [],
};

export function canTransition(from: FixedStatus, to: FixedStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: FixedStatus, to: FixedStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transición de fijo inválida: ${from} → ${to}`);
  }
}

/**
 * Construye la transacción que se crea automáticamente al marcar un fijo como pagado
 * (§5.3). Si el fijo es un abono a deuda, genera un movimiento `debt_payment`; si no, un
 * `expense`. Devuelve un borrador (sin id/timestamps de auditoría), listo para validar y
 * persistir.
 */
export function buildTransactionFromFixed(
  fixed: FixedObligationMonthly,
  options: PayFixedOptions,
): TransactionDraft {
  const base = {
    date: options.date,
    concept: fixed.name,
    amount: options.amount,
    tags: [] as string[],
    note: null,
    fixedMonthlyId: fixed.id,
  };

  if (fixed.payKind === 'debt_payment') {
    return {
      ...base,
      type: 'debt_payment',
      categoryId: null, // los abonos no cuentan como gasto (§5.4)
      source: options.paymentMethod,
      destination: options.debtTarget ?? null,
      adjustmentDirection: null,
    };
  }

  return {
    ...base,
    type: 'expense',
    categoryId: fixed.categoryId,
    source: options.paymentMethod,
    destination: null,
    adjustmentDirection: null,
  };
}
