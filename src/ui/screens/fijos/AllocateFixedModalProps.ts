import type { Account, EntityRef, FixedObligationMonthly } from '../../../domain/types';

export interface AllocateFixedModalProps {
  open: boolean;
  fixed: FixedObligationMonthly | null;
  accounts: Account[];
  // Fijos del mes: para calcular el reservado/disponible actual de la cuenta elegida (§5.1).
  monthlyFixeds: FixedObligationMonthly[];
  onClose: () => void;
  onConfirm: (account: EntityRef) => Promise<void> | void;
}
