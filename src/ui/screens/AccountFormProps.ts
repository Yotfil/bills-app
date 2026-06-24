import type { Account } from '../../domain/types';

export interface AccountFormProps {
  open: boolean;
  account?: Account | null;
  defaultSavingsBucket?: boolean; // al crear desde la sección Ahorros, viene marcado
  onClose: () => void;
}
