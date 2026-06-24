import type { BaseDoc } from './BaseDoc';
import type { Archivable } from './Archivable';

export interface CreditCard extends BaseDoc, Archivable {
  name: string;
  creditLimit: number; // cupo total
  initialDebt: number; // deuda al sembrar (semilla del onboarding, NO cambia tras crear)
  cachedDebt: number; // deuda actual (caché derivada de los movimientos)
  color: string;
  icon: string;
  sortOrder: number;
  // DERIVADO: availableCredit = creditLimit - cachedDebt
  // RECÁLCULO TOTAL (§9.3): cachedDebt = initialDebt + Σ(deltas de movimientos). Igual que
  // las cuentas guardan `initialBalance` aparte de `cachedBalance`, la tarjeta guarda la
  // semilla aparte de la caché para poder reconstruir la deuda si las cachés divergen.
}
