export interface BudgetCapModalProps {
  open: boolean;
  /** Nombre de la categoría del presupuesto (para el título). */
  categoryName: string;
  /** Tope efectivo actual del mes (prellena el campo). */
  currentValue: number;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}
