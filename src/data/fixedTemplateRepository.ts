// Repositorio de la plantilla de obligaciones fijas (CLAUDE.md §5.2, §8.4, §10).
import { fixedTemplatesCol } from './collections';
import { archive, create, subscribeAll, update, type CreateInput, type UpdateInput } from './crud';
import type { NewFixedTemplate } from './NewFixedTemplate';
import type { FixedObligationTemplate } from '../domain/types';

export type { NewFixedTemplate } from './NewFixedTemplate';

/** Construye el documento a crear (función pura, testeable). */
export function buildFixedTemplateCreateInput(
  input: NewFixedTemplate,
): CreateInput<FixedObligationTemplate> {
  return {
    name: input.name.trim(),
    budgetedAmount: input.budgetedAmount,
    categoryId: input.categoryId,
    defaultPaymentMethod: input.defaultPaymentMethod,
    payKind: input.payKind,
    debtTargetId: input.debtTargetId,
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 0,
    archived: false,
    archivedAt: null,
  };
}

export const subscribeFixedTemplates = (
  uid: string,
  onChange: (items: FixedObligationTemplate[]) => void,
) => subscribeAll(fixedTemplatesCol(uid), onChange);

export const createFixedTemplate = (uid: string, input: NewFixedTemplate) =>
  create(fixedTemplatesCol(uid), buildFixedTemplateCreateInput(input));

export const updateFixedTemplate = (
  uid: string,
  id: string,
  data: UpdateInput<FixedObligationTemplate>,
) => update(fixedTemplatesCol(uid), id, data);

export const archiveFixedTemplate = (uid: string, id: string) =>
  archive(fixedTemplatesCol(uid), id);
