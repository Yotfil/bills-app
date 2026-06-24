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
  color: string;
  icon: string;
  sortOrder: number;
  // DERIVADOS (no se guardan, se calculan al leer):
  //   reserved  = Σ fijos del mes en estado 'allocated' asignados a esta cuenta
  //   available = cachedBalance - reserved
}
