import type { BaseDoc } from './BaseDoc';
import type { Archivable } from './Archivable';

export interface CreditCard extends BaseDoc, Archivable {
  name: string;
  creditLimit: number; // cupo total
  cachedDebt: number; // deuda actual (caché derivada)
  color: string;
  icon: string;
  sortOrder: number;
  // DERIVADO: availableCredit = creditLimit - cachedDebt
}
