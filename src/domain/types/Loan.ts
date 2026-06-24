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
  // Vínculo con la cuota: es IMPLÍCITO. Un fijo de tipo 'abono a deuda' cuyo `debtTargetId`
  // apunte a este crédito ES su cuota (§5.6). Ligados, comparten el valor y el estado de pago
  // del mes: pagar/deshacer en un lado se refleja en el otro. (No hay campo de vínculo aquí.)
  // DERIVADO: progress = 1 - (cachedBalance / originalAmount)
}
