// Repositorio de la plantilla de obligaciones fijas (CLAUDE.md §5.2, §8.4, §10).
import { fixedTemplatesCol } from './collections';
import {
  archive,
  create,
  hardDelete,
  subscribeAll,
  unarchive,
  update,
  type CreateInput,
  type UpdateInput,
} from './crud';
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
    budgetBacked: input.budgetBacked ?? false,
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

// Marca/desmarca un fijo como "candidata a cancelar" desde el módulo de Suscripciones (§15).
export const setCancelCandidate = (uid: string, id: string, value: boolean) =>
  update(fixedTemplatesCol(uid), id, { cancelCandidate: value });

export const archiveFixedTemplate = (uid: string, id: string) =>
  archive(fixedTemplatesCol(uid), id);

export const unarchiveFixedTemplate = (uid: string, id: string) =>
  unarchive(fixedTemplatesCol(uid), id);

// La plantilla es solo el "molde" del rollover: las instancias mensuales que generó son
// snapshots autocontenidos (guardan su propio nombre/monto), así que borrar la plantilla NO
// rompe el histórico (§8.4). Se puede eliminar siempre.
export const deleteFixedTemplate = (uid: string, id: string) =>
  hardDelete(fixedTemplatesCol(uid), id);
