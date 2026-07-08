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
  // TARJETA MULTIMONEDA (2026-07-07): una tarjeta puede cobrar en COP y también en compras
  // internacionales en cualquier divisa (USD, EUR…). La deuda COP vive en `cachedDebt`; las deudas
  // en divisa viven en `foreignDebts` (mapa moneda→monto en esa moneda, la FUENTE DE VERDAD de cada
  // pool). El COP de cada pool en divisa se calcula EN VIVO con la tasa del día (como se paga: a la
  // TRM del día del pago, no de la compra). El cupo sigue en COP y el disponible ≈ es
  // creditLimit − (cachedDebt + Σ monto_divisa × tasa). Ausente/{} = tarjeta sin deuda en divisa.
  foreignDebts?: Record<string, number>;
}
