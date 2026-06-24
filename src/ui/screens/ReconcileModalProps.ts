import type { Account } from '../../domain/types';

export interface ReconcileModalProps {
  open: boolean;
  account: Account | null;
  onClose: () => void;
}
