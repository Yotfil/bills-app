import type { Account, CreditCard, FixedObligationMonthly, Loan } from '../../../domain/types';
import type { PayFixedInput } from '../../../data/PayFixedInput';

export interface PayFixedModalProps {
  open: boolean;
  fixed: FixedObligationMonthly | null;
  accounts: Account[];
  cards: CreditCard[];
  loans: Loan[];
  onClose: () => void;
  onConfirm: (input: PayFixedInput) => Promise<void> | void;
}
