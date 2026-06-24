import type { Account, CreditCard, FixedObligationMonthly } from '../../../domain/types';
import type { PayFixedInput } from '../../../data/PayFixedInput';

export interface PayFixedModalProps {
  open: boolean;
  fixed: FixedObligationMonthly | null;
  accounts: Account[];
  cards: CreditCard[];
  onClose: () => void;
  onConfirm: (input: PayFixedInput) => Promise<void> | void;
}
