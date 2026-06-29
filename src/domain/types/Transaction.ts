import type { Timestamp } from 'firebase/firestore';
import type { BaseDoc } from './BaseDoc';
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
}

/**
 * Datos de una transacción ANTES de persistir (sin los campos que pone la capa de datos:
 * id y timestamps de auditoría). La validación y el cálculo de saldos trabajan con esto.
 */
export type TransactionDraft = Omit<
  Transaction,
  'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'
>;
