// Rollover mensual de obligaciones fijas (CLAUDE.md §5.10, §5.2). Función PURA: genera la
// instancia del mes a partir de la plantilla. Los saldos NO se tocan aquí (los fijos nacen
// en 'pending'); la capa de datos persiste y evita duplicados.
import type { BaseDoc } from './types';
import type { FixedObligationMonthly } from './types';
import type { FixedObligationTemplate } from './types';

/** Instancia mensual a crear (sin id ni auditoría: los pone la capa de datos). */
export type MonthlyFixedDraft = Omit<FixedObligationMonthly, keyof BaseDoc>;

/**
 * Genera los fijos del mes desde las plantillas activas. Cada uno nace en 'pending' con un
 * SNAPSHOT de la plantilla (no se reescribe si la plantilla cambia luego, §5.2). Omite las
 * plantillas archivadas, inactivas, y las que ya tienen instancia este mes (idempotente).
 */
export function generateMonthlyFixeds(
  templates: FixedObligationTemplate[],
  month: string,
  alreadyGeneratedTemplateIds: string[] = [],
): MonthlyFixedDraft[] {
  const already = new Set(alreadyGeneratedTemplateIds);
  return templates
    .filter((t) => t.active && !t.archived && !already.has(t.id))
    .map((t) => ({
      month,
      templateId: t.id,
      // Snapshots de la plantilla:
      name: t.name,
      budgetedAmount: t.budgetedAmount,
      categoryId: t.categoryId,
      payKind: t.payKind,
      debtTargetId: t.debtTargetId,
      consumesBudget: t.consumesBudget ?? false,
      autoPayDay: t.autoPayDay ?? null, // día de auto-registro (§5.3); nace sin `autoPaidAt`
      paymentMethod: t.defaultPaymentMethod,
      // Estado inicial:
      status: 'pending',
      paidAmount: null,
      transactionId: null,
      allocatedAt: null,
      paidAt: null,
    }));
}
