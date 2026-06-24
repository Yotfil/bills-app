import type { Loan } from '../../../domain/types';

export interface LoanFormProps {
  open: boolean;
  loan?: Loan | null;
  onClose: () => void;
}
