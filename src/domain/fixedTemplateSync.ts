// Sincronización plantilla → fijos del mes (CLAUDE.md §5.2, §5.10). Lógica PURA: dado el set de
// plantillas y los fijos ya generados de un mes, calcula qué falta agregar, qué quedó
// desactualizado y qué sobra. La UI muestra el diff y deja al usuario elegir qué aplicar; la capa
// de datos ejecuta los cambios. No toca fijos PAGADOS (son histórico, §5.2).
import type { FixedObligationMonthly, FixedObligationTemplate } from './types';
import type { FixedChangedField, FixedSyncDiff, FixedTemplateChange } from './FixedSyncDiff';

export type { FixedChangedField, FixedSyncDiff, FixedTemplateChange } from './FixedSyncDiff';

export interface FixedSyncOptions {
  /**
   * Si se compara el medio de pago. Por defecto `false`: el medio del mes es editable y puede
   * haberse cambiado a propósito ese mes, así que no se marca como desactualizado (§5.2).
   */
  comparePaymentMethod?: boolean;
}

function isUsable(template: FixedObligationTemplate): boolean {
  return template.active && !template.archived;
}

/** Campos del snapshot que difieren entre el fijo del mes y su plantilla. */
function changedFields(
  fixed: FixedObligationMonthly,
  template: FixedObligationTemplate,
  comparePaymentMethod: boolean,
): FixedChangedField[] {
  const changed: FixedChangedField[] = [];
  if (fixed.name !== template.name) changed.push('name');
  if (fixed.budgetedAmount !== template.budgetedAmount) changed.push('budgetedAmount');
  if (fixed.categoryId !== template.categoryId) changed.push('categoryId');
  if (fixed.payKind !== template.payKind) changed.push('payKind');
  if (fixed.debtTargetId !== template.debtTargetId) changed.push('debtTargetId');
  if (fixed.budgetBacked !== template.budgetBacked) changed.push('budgetBacked');
  if (
    comparePaymentMethod &&
    (fixed.paymentMethod.kind !== template.defaultPaymentMethod.kind ||
      fixed.paymentMethod.id !== template.defaultPaymentMethod.id)
  ) {
    changed.push('paymentMethod');
  }
  return changed;
}

/**
 * Calcula el diff entre las plantillas y los fijos del mes. `templates` y `fijos` son los del
 * usuario; `fijos` debe ser de UN mes (ya filtrado por la capa que llama).
 */
export function computeFixedSyncDiff(
  templates: FixedObligationTemplate[],
  fijos: FixedObligationMonthly[],
  options: FixedSyncOptions = {},
): FixedSyncDiff {
  const comparePaymentMethod = options.comparePaymentMethod ?? false;
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const monthlyTemplateIds = new Set(fijos.map((f) => f.templateId));

  // Agregar: plantillas usables sin instancia este mes.
  const toAdd = templates.filter((t) => isUsable(t) && !monthlyTemplateIds.has(t.id));

  const toUpdate: FixedTemplateChange[] = [];
  const toRemove: FixedObligationMonthly[] = [];

  for (const fixed of fijos) {
    const template = templateById.get(fixed.templateId);
    // Quitar: la plantilla ya no existe, o quedó archivada/inactiva → este fijo ya no aplica.
    if (!template || !isUsable(template)) {
      toRemove.push(fixed);
      continue;
    }
    // Actualizar: solo NO pagados (los pagados conservan su registro histórico, §5.2).
    if (fixed.status === 'paid') continue;
    const changed = changedFields(fixed, template, comparePaymentMethod);
    if (changed.length > 0) toUpdate.push({ fixed, template, changedFields: changed });
  }

  return { toAdd, toUpdate, toRemove };
}

/** `true` si hay al menos un cambio pendiente de aplicar al mes. */
export function hasFixedSyncChanges(diff: FixedSyncDiff): boolean {
  return diff.toAdd.length + diff.toUpdate.length + diff.toRemove.length > 0;
}

/** Total de cambios pendientes (para el contador del banner/icono). */
export function fixedSyncChangeCount(diff: FixedSyncDiff): number {
  return diff.toAdd.length + diff.toUpdate.length + diff.toRemove.length;
}
