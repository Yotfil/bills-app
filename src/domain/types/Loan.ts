import type { Timestamp } from 'firebase/firestore';
import type { BaseDoc } from './BaseDoc';
import type { Archivable } from './Archivable';

export interface Loan extends BaseDoc, Archivable {
  name: string;
  originalAmount: number;
  cachedBalance: number; // saldo actual (caché derivada de abonos)
  monthlyPayment: number; // cuota mensual
  annualRate: number | null; // tasa opcional; sin ella, la fecha estimada es aproximada
  startDate: Timestamp | null;
  // Vínculo opcional con un fijo de tipo 'abono a deuda' que apunta a este crédito (§5.6).
  // Ligados, comparten el valor de la cuota y el estado de pago del mes: pagar/deshacer en un
  // lado se refleja en el otro. `null` = cuota suelta (se paga con el abono genérico).
  linkedFixedTemplateId: string | null;
  // DERIVADO: progress = 1 - (cachedBalance / originalAmount)
}
