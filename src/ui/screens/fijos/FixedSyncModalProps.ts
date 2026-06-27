import type { FixedSyncDiff } from '../../../domain/fixedTemplateSync';
import type { Category, CreditCard, Loan } from '../../../domain/types';

/** Qué ítems del diff marcó el usuario para aplicar (lo no marcado no se toca). */
export interface FixedSyncSelection {
  add: Set<string>; // ids de plantilla a agregar
  update: Set<string>; // ids de fijo a actualizar
  remove: Set<string>; // ids de fijo a quitar
}

export interface FixedSyncModalProps {
  open: boolean;
  diff: FixedSyncDiff;
  monthLabel: string;
  /** Para resolver nombres legibles (categoría, deuda destino) al mostrar los cambios. */
  categories: Category[];
  cards: CreditCard[];
  loans: Loan[];
  onApply: (selection: FixedSyncSelection) => void | Promise<void>;
  onClose: () => void;
}
