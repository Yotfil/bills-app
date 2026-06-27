/** Un tope excedido para la alerta del dashboard (§8.1, §5.9). */
export interface ExceededBudgetItem {
  id: string;
  categoryName: string;
  overspend: number; // por cuánto se pasó del tope
}

export interface ExceededBudgetsAlertProps {
  items: ExceededBudgetItem[];
}
