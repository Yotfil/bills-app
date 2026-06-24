import type { Category } from '../../../domain/types';

export interface CategoryFormProps {
  open: boolean;
  category?: Category | null;
  /** Orden a asignar al crear (va al final de la lista). */
  nextSortOrder: number;
  onClose: () => void;
}
