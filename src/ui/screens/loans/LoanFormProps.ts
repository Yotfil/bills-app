import type { FixedObligationTemplate, Loan } from '../../../domain/types';

export interface LoanFormProps {
  open: boolean;
  loan?: Loan | null;
  /** Plantillas de fijos, para ofrecer ligar la cuota a un fijo "abono a deuda" (§5.6). */
  templates: FixedObligationTemplate[];
  onClose: () => void;
}
