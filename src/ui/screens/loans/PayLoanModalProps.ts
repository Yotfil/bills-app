import type { Account, Loan } from '../../../domain/types';

export interface PayLoanModalProps {
  open: boolean;
  loan: Loan | null;
  accounts: Account[];
  onClose: () => void;
}
