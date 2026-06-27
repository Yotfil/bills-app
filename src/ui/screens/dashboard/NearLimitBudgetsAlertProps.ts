/** Un tope cerca de excederse para la alerta preventiva del dashboard (§8.1, §5.9). */
export interface NearLimitBudgetItem {
  id: string;
  categoryName: string;
  remaining: number; // cuánto le queda al tope
}

export interface NearLimitBudgetsAlertProps {
  items: NearLimitBudgetItem[];
}
