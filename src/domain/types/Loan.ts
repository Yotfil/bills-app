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
  // DERIVADO: progress = 1 - (cachedBalance / originalAmount)
}
