import type { FixedObligationMonthly } from './types';
import type { FixedObligationTemplate } from './types';

// Campos del snapshot mensual que pueden quedar desactualizados frente a su plantilla (§5.2).
export type FixedChangedField =
  | 'name'
  | 'budgetedAmount'
  | 'categoryId'
  | 'payKind'
  | 'debtTargetId'
  | 'consumesBudget'
  | 'paymentMethod';

/** Un fijo del mes cuyo snapshot difiere de su plantilla actual, con los campos que cambiaron. */
export interface FixedTemplateChange {
  fixed: FixedObligationMonthly;
  template: FixedObligationTemplate;
  changedFields: FixedChangedField[];
}

/**
 * Diferencias entre la PLANTILLA y los fijos ya generados de un mes (§5.2, §5.10). Permite
 * reconciliar un mes con cambios hechos a la plantilla después de generarlo:
 * - `toAdd`: plantillas activas sin instancia este mes (se agregaron después de generar).
 * - `toUpdate`: instancias NO pagadas cuyo snapshot difiere de su plantilla.
 * - `toRemove`: instancias cuya plantilla ya no aplica (borrada, archivada o inactiva).
 */
export interface FixedSyncDiff {
  toAdd: FixedObligationTemplate[];
  toUpdate: FixedTemplateChange[];
  toRemove: FixedObligationMonthly[];
}
