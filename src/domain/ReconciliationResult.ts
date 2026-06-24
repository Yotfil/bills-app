import type { AdjustmentDirection } from './types';

// Resultado del cálculo de reconciliación (CLAUDE.md §5.7).
export interface ReconciliationResult {
  direction: AdjustmentDirection;
  amount: number; // siempre positivo (el desfase); la dirección decide si suma o resta
}
