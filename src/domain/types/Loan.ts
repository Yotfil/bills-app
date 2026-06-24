import type { Timestamp } from 'firebase/firestore';
import type { BaseDoc } from './BaseDoc';
import type { Archivable } from './Archivable';

export interface Loan extends BaseDoc, Archivable {
  name: string;
  originalAmount: number; // monto original del crédito (para el progreso de amortización)
  seedBalance: number; // saldo al sembrar (semilla del onboarding, NO cambia tras crear)
  cachedBalance: number; // saldo actual (caché derivada de los abonos)
  monthlyPayment: number; // cuota mensual
  annualRate: number | null; // tasa opcional; sin ella, la fecha estimada es aproximada
  startDate: Timestamp | null;
  // RECÁLCULO TOTAL (§9.3): cachedBalance = seedBalance + Σ(deltas de movimientos). `seedBalance`
  // es el saldo al momento de sembrar el crédito (puede venir ya parcialmente pagado), distinto
  // de `originalAmount` (que solo sirve para el % de progreso). Separar semilla y caché permite
  // reconstruir el saldo si las cachés divergen, igual que las cuentas con `initialBalance`.
  // Vínculo con la cuota: es IMPLÍCITO. Un fijo de tipo 'abono a deuda' cuyo `debtTargetId`
  // apunte a este crédito ES su cuota (§5.6). Ligados, comparten el valor y el estado de pago
  // del mes: pagar/deshacer en un lado se refleja en el otro. (No hay campo de vínculo aquí.)
  // DERIVADO: progress = 1 - (cachedBalance / originalAmount)
}
