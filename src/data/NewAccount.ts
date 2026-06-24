import type { AccountType } from '../domain/types';

// Datos que recibe el repositorio para crear una cuenta (CLAUDE.md §5.1).
export interface NewAccount {
  name: string;
  type: AccountType;
  initialBalance: number; // semilla del onboarding
  savingsBucket?: boolean; // true = bolsa de ahorro (sección Ahorros, no cuenta en disponible)
  foreignCurrency?: string | null; // p.ej. 'USD' si la cuenta vive en otra moneda
  foreignAmount?: number | null; // monto en esa moneda (referencia; el saldo real es COP)
  color?: string;
  icon?: string;
  sortOrder?: number;
}
