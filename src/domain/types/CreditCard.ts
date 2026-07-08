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
  //
  // TARJETA MIXTA (gastos en divisa, 2026-07-07): una tarjeta puede cobrar en COP o en una divisa
  // (ej. USD) según si la compra es internacional. Mantiene DOS pools de deuda: COP (`cachedDebt`,
  // arriba) y divisa (`cachedForeignDebt`). La parte en divisa es la FUENTE DE VERDAD de su pool y
  // su COP se calcula EN VIVO con la tasa del día (como `Account.foreignAmount`). El cupo sigue en
  // COP; el disponible ≈ creditLimit − (cachedDebt + cachedForeignDebt × tasa). Ausentes = COP pura.
  foreignCurrency?: string | null; // divisa en la que la tarjeta puede cobrar (ej. 'USD')
  cachedForeignDebt?: number; // deuda en esa divisa (fuente de verdad; admite decimales)
  initialForeignDebt?: number; // semilla de la deuda en divisa (mirror de initialDebt)
}
