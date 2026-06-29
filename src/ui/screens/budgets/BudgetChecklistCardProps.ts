export interface BudgetChecklistCardProps {
  categoryName: string;
  /** Tope efectivo del mes (del Budget). */
  cap: number;
  /** Gasto de la categoría en el mes. */
  consumed: number;
  /** "Ya estaba pagado (sin movimiento)" marcado este mes. */
  manuallyPaid: boolean;
  onEditCap: () => void;
  onMarkPaid: () => void;
  onUndoPaid: () => void;
}
