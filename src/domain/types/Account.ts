import type { BaseDoc } from './BaseDoc';
import type { Archivable } from './Archivable';

export type AccountType = 'savings' | 'cash' | 'term_deposit';

export interface Account extends BaseDoc, Archivable {
  name: string;
  type: AccountType;
  initialBalance: number; // semilla del onboarding
  cachedBalance: number; // derivado de los movimientos (caché)
  // Si es una "bolsa de ahorro" (dinero apartado): se muestra en la sección Ahorros y NO
  // cuenta en el disponible real (§4). False = cuenta de uso/gasto normal.
  savingsBucket: boolean;
  // Cuenta en MONEDA EXTRANJERA (decisión 2026-07-09): la cuenta es monomoneda y su fuente de
  // verdad es `foreignAmount` (en su divisa; admite decimales), movida SOLO por movimientos en
  // esa divisa (ver foreignLedger.foreignDelta). El COP que se muestra es la conversión EN VIVO
  // con la tasa del día (foreignBalance.accountBalanceCop); `cachedBalance` queda como ledger
  // COP interno y fallback offline. null = cuenta en COP normal.
  foreignCurrency: string | null;
  foreignAmount: number | null;
  color: string;
  icon: string;
  sortOrder: number;
  // DERIVADOS (no se guardan, se calculan al leer):
  //   reserved  = Σ fijos del mes en estado 'allocated' asignados a esta cuenta
  //   available = cachedBalance - reserved
}
