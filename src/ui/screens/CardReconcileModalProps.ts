import type { CreditCard } from '../../domain/types';
import type { ExchangeRateTable } from '../../domain/ExchangeRateTable';

export interface CardReconcileModalProps {
  open: boolean;
  card: CreditCard | null;
  table: ExchangeRateTable | null;
  onClose: () => void;
}
