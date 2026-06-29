import type { FixedObligationMonthly } from '../../domain/types';

export interface ReservedBreakdownModalProps {
  open: boolean;
  accountName: string;
  // Fijos destinados (allocated) que reservan dinero de esta cuenta, con su mes y monto.
  items: FixedObligationMonthly[];
  onUndestine: (fixed: FixedObligationMonthly) => void; // deshacer el destinado (sin movimiento)
  onClose: () => void;
}
