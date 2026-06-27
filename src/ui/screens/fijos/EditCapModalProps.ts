import type { FixedObligationMonthly } from '../../../domain/types';

export interface EditCapModalProps {
  open: boolean;
  fixed: FixedObligationMonthly | null;
  /** Nuevo tope para el mes en curso (actualiza el fijo y el presupuesto en espejo, §5.9). */
  onConfirm: (amount: number) => void | Promise<void>;
  onClose: () => void;
}
