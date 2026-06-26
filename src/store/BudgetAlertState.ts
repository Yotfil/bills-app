// Recuerda qué avisos de tope ya se mostraron (CLAUDE.md §5.9), para que el pop-up salga APENAS un
// presupuesto cruza el umbral y NO se repita. Clave: `${mes}:${budgetId}`; valor: el nivel más alto
// ya avisado ('near' o 'exceeded'). Estado de cliente puro (no toca reglas de negocio).
export type AcknowledgedLevel = 'near' | 'exceeded';

export interface BudgetAlertState {
  acknowledged: Record<string, AcknowledgedLevel>;
  /** Marca como avisado un tope a cierto nivel (lo eleva si era menor). */
  acknowledge: (key: string, level: AcknowledgedLevel) => void;
}
