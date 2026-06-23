// Modelo de dominio (CLAUDE.md §9.1). Tipos limpios con los que trabaja la lógica de
// negocio, sin detalles de Firestore. `Timestamp` se importa SOLO como tipo (import type):
// se borra en compilación, así que el dominio no arrastra el runtime de Firebase y las
// funciones puras siguen siendo testeables sin Firebase. Las fechas no se manipulan aquí
// (la UI las convierte a Date/ISO al mostrar; los converters traducen en la capa de datos).
import type { Timestamp } from 'firebase/firestore';

export interface BaseDoc {
  id: string; // = doc.id (NO se guarda dentro del documento)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number; // para migraciones futuras
}

export interface Archivable {
  archived: boolean;
  archivedAt: Timestamp | null; // borrar = archivar si hay histórico
}

export type LedgerEntityKind = 'account' | 'card' | 'loan';

export interface EntityRef {
  kind: LedgerEntityKind;
  id: string;
}

// ---------- Cuentas ----------
export type AccountType = 'savings' | 'cash' | 'term_deposit';

export interface Account extends BaseDoc, Archivable {
  name: string;
  type: AccountType;
  initialBalance: number; // semilla del onboarding
  cachedBalance: number; // derivado de los movimientos (caché)
  color: string;
  icon: string;
  sortOrder: number;
  // DERIVADOS (no se guardan, se calculan al leer):
  //   reserved  = Σ fijos del mes en estado 'allocated' asignados a esta cuenta
  //   available = cachedBalance - reserved
}

// ---------- Tarjetas de crédito ----------
export interface CreditCard extends BaseDoc, Archivable {
  name: string;
  creditLimit: number; // cupo total
  cachedDebt: number; // deuda actual (caché derivada)
  color: string;
  icon: string;
  sortOrder: number;
  // DERIVADO: availableCredit = creditLimit - cachedDebt
}

// ---------- Créditos grandes ----------
export interface Loan extends BaseDoc, Archivable {
  name: string;
  originalAmount: number;
  cachedBalance: number; // saldo actual (caché derivada de abonos)
  monthlyPayment: number; // cuota mensual
  annualRate: number | null; // tasa opcional; sin ella, la fecha estimada es aproximada
  startDate: Timestamp | null;
  // DERIVADO: progress = 1 - (cachedBalance / originalAmount)
}

// ---------- Categorías ----------
export interface Category extends BaseDoc, Archivable {
  name: string;
  icon: string;
  color: string;
  isSystem: boolean; // p.ej. "Ajuste / Reconciliación": no editable
  includeInSpendReports: boolean; // false para sistema/ajuste
  sortOrder: number;
}

// ---------- Plantilla de obligaciones fijas ----------
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

// ---------- Instancia mensual de un fijo ----------
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

// ---------- Presupuestos ----------
export interface Budget extends BaseDoc, Archivable {
  categoryId: string;
  monthlyLimit: number; // tope
  active: boolean;
  // DERIVADO: lo consumido = Σ gastos de esa categoría en el mes
}

// ---------- Transacciones (libro unificado) ----------
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
}

/**
 * Datos de una transacción ANTES de persistir (sin los campos que pone la capa de datos:
 * id y timestamps de auditoría). La validación y el cálculo de saldos trabajan con esto.
 */
export type TransactionDraft = Omit<
  Transaction,
  'id' | 'createdAt' | 'updatedAt' | 'schemaVersion'
>;

// ---------- Ajustes del usuario (doc del usuario) ----------
export interface UserSettings {
  currency: 'COP';
  locale: string; // 'es-CO'
  onboardingCompleted: boolean;
  schemaVersion: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Etiqueta transversal de "gasto hormiga" (CLAUDE.md §5.8). */
export const HORMIGA_TAG = 'hormiga';
