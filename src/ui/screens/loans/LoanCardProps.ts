import type { Loan } from '../../../domain/types';

export interface LoanCardProps {
  loan: Loan;
  onPay: () => void;
  onEdit: () => void;
  onArchive: () => void;
}
