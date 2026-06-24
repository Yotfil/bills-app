import type { Loan } from '../../../domain/types';

export interface LoanCardProps {
  loan: Loan;
  /** `true` si la cuota está ligada a un fijo (§5.6): se muestra el estado del mes. */
  linked: boolean;
  /** `true` si la cuota del mes ya está pagada (derivado del fijo ligado). */
  cuotaPaid: boolean;
  /** Etiqueta del mes en curso, p.ej. "junio 2026". */
  monthLabel: string;
  /** Pagar la cuota: 1 toque si está ligada, o abrir el modal de abono si no. */
  onPay: () => void;
  /** Deshacer el pago de la cuota del mes (solo si está ligada y pagada). */
  onUndoCuota: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}
