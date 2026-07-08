import type { Timestamp } from 'firebase/firestore';
import type { BaseDoc } from './BaseDoc';
import type { BudgetBoost } from './BudgetBoost';
import type { EntityRef } from './EntityRef';

export type TransactionType =
  | 'expense' // gasto real (cuenta -, o sube deuda de tarjeta)
  | 'income' // entra a una cuenta
  | 'transfer' // entre cuentas propias
  | 'debt_payment' // abono a tarjeta/crédito
  | 'adjustment'; // reconciliación

export type AdjustmentDirection = 'increase' | 'decrease';

export interface Transaction extends BaseDoc {
  date: Timestamp;
  concept: string;
  type: TransactionType;
  amount: number; // entero COP, SIEMPRE positivo
  categoryId: string | null; // requerido en 'expense'; sistema/null en otros
  source: EntityRef | null; // origen: expense/transfer/debt_payment/adjustment
  destination: EntityRef | null; // destino: transfer (account) / debt_payment (card|loan)
  adjustmentDirection: AdjustmentDirection | null; // solo en 'adjustment'
  tags: string[]; // p.ej. ['hormiga']
  note: string | null;
  fixedMonthlyId: string | null; // enlace al fijo que lo generó (si aplica)
  // Mes contable 'YYYY-MM' al que pertenece el movimiento para PRESUPUESTOS (no para la caja). Si es
  // null, se usa el mes de `date`. Lo setea el pago de un fijo con el mes del fijo: así pagar HOY un
  // fijo de otro mes (p.ej. Julio por adelantado) consume el presupuesto de Julio, aunque el
  // movimiento —y el Registro/caja— sea de hoy. Separa "cuándo pagué" de "a qué mes pertenece".
  periodMonth: string | null;
  // Aumentos de presupuesto ligados a este ingreso (§5.9): parte del ingreso sube el tope de uno o
  // varios presupuestos en el mes elegido. Solo en `income`. Se hornea en el override del presupuesto
  // al crear y se revierte al borrar/editar. Ausente = sin aumentos.
  budgetBoosts?: BudgetBoost[];
  // Movimiento EN DIVISA sobre una cuenta en moneda extranjera (decisión 2026-07-09): el monto
  // original en la divisa; `amount` es su conversión a COP con la tasa del día (reportes/caja).
  // LIGADO y reversible: crear/editar/borrar aplica/revierte el delta sobre Account.foreignAmount
  // (la fuente de verdad); el lado y el signo los deriva foreignLedger.foreignDelta según el tipo
  // (ingreso, gasto, transferencia misma-moneda, ajuste). Ausente = movimiento COP normal.
  foreignCurrency?: string | null;
  foreignAmount?: number | null; // en la divisa, puede llevar decimales (la regla "entero" es COP)
  // Transferencia CROSS-MONEDA (cuentas en distinta moneda, montos manuales por lado): los campos
  // `amount`/`foreignCurrency`/`foreignAmount` de arriba describen la pata de ORIGEN (lo que sale);
  // estos describen la pata de DESTINO (lo que entra). Su presencia (`destinationAmount != null`)
  // marca la transferencia como cross-moneda. Cuando un lado es COP, `amount` y `destinationAmount`
  // coinciden (el valor real de la operación) y el ledger COP queda en neto cero; si ambos lados son
  // divisa, cada pata usa la conversión del día. Ausente = transferencia normal (misma moneda).
  destinationAmount?: number | null; // COP que ENTRA al destino (entero, positivo)
  destinationForeignCurrency?: string | null;
  destinationForeignAmount?: number | null; // en la divisa del destino (decimales permitidos)
}

/**
 * Datos de una transacción ANTES de persistir (sin los campos que pone la capa de datos:
 * id y timestamps de auditoría). La validación y el cálculo de saldos trabajan con esto.
 */
export type TransactionDraft = Omit<
  Transaction,
  'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'
>;
