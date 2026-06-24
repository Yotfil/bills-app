import type { CreditCard } from '../../domain/types';

export interface CardFormProps {
  open: boolean;
  card?: CreditCard | null;
  onClose: () => void;
}
