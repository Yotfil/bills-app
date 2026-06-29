// Obligaciones fijas: máquina de estados y conexión fijo→registro (CLAUDE.md §5.2, §5.3).
// Lógica pura: decide transiciones válidas y construye la transacción que se crea al pagar.
// Los timestamps (allocatedAt/paidAt, date) los pone la capa de datos; aquí se reciben.
import type { FixedObligationMonthly, FixedStatus, TransactionDraft } from './types';
import type { PayFixedOptions } from './PayFixedOptions';
import type { FixedTotals } from './FixedTotals';

export type { PayFixedOptions } from './PayFixedOptions';
export type { FixedTotals } from './FixedTotals';

/**
 * Totales del checklist mensual de fijos (§8.3): cuánto falta, destinado y pagado.
 *
 * `statusOf` permite usar un estado EFECTIVO en vez del guardado: los fijos respaldados por
 * presupuesto (§5.9) derivan su estado del consumo (pending mientras no se llenan, paid al
 * llenarse), así que su TOPE pasa de "Por destinar" a "Pagado" sin crear movimiento ni duplicar
 * (los totales solo suman fijos). Por defecto se usa `fixed.status`.
 */
export function fixedTotals(
  monthlyFixeds: FixedObligationMonthly[],
  statusOf: (fixed: FixedObligationMonthly) => FixedStatus = (f) => f.status,
  amountOf: (fixed: FixedObligationMonthly) => number = (f) => f.paidAmount ?? f.budgetedAmount,
): FixedTotals {
  const totals: FixedTotals = {
    pendingAmount: 0,
    allocatedAmount: 0,
    paidAmount: 0,
    counts: { pending: 0, allocated: 0, paid: 0, total: monthlyFixeds.length },
  };
  for (const fixed of monthlyFixeds) {
    const status = statusOf(fixed);
    const amount = amountOf(fixed);
    if (status === 'pending') {
      totals.pendingAmount += amount;
      totals.counts.pending += 1;
    } else if (status === 'allocated') {
      totals.allocatedAmount += amount;
      totals.counts.allocated += 1;
    } else {
      // El total pagado refleja lo REALMENTE pagado (§5.3). Para un respaldado lleno/excedido,
      // `amountOf` devuelve el gasto real (incluye el sobrepaso, §5.9); para uno normal, su pagado.
      totals.paidAmount += amount;
      totals.counts.paid += 1;
    }
  }
  return totals;
}

/**
 * Suma del aporte a "Por destinar" de los gastos "apagados" (§8.3): Σ `amountOf` de los items apagados
 * que están PENDIENTES (los únicos que cuentan en `pendingAmount`). Apagar un pagado/destinado no suma
 * (su aporte a Por destinar es 0). Es un cálculo de visualización temporal; no toca saldos.
 */
export function mutedPendingTotal(
  monthlyFixeds: FixedObligationMonthly[],
  isMuted: (id: string) => boolean,
  statusOf: (fixed: FixedObligationMonthly) => FixedStatus = (f) => f.status,
  amountOf: (fixed: FixedObligationMonthly) => number = (f) => f.paidAmount ?? f.budgetedAmount,
): number {
  return monthlyFixeds.reduce(
    (sum, f) => (isMuted(f.id) && statusOf(f) === 'pending' ? sum + amountOf(f) : sum),
    0,
  );
}

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
    // El movimiento se fecha cuando se paga (options.date = hoy), pero pertenece al MES del fijo para
    // los presupuestos: pagar por adelantado un fijo de otro mes consume el presupuesto de ESE mes.
    periodMonth: fixed.month,
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
