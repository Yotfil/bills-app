import type { Account } from '../../domain/types';

export interface AccountFormProps {
  open: boolean;
  account?: Account | null;
  onClose: () => void;
}
