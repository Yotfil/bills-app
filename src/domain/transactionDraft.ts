// Construcción de un borrador de transacción a partir de la intención del usuario en el
// formulario (CLAUDE.md §5.4, §11). Función PURA: arma los campos con los null correctos por
// tipo, para que el resultado pase la validación. La adjustment se crea por reconciliación.
import { HORMIGA_TAG, type TransactionDraft } from './types';
import type { ManualEntryInput } from './ManualEntryInput';

export type { ManualEntryInput } from './ManualEntryInput';

/** Etiquetas en español de los tipos capturables a mano: botones del form y concepto por defecto. */
export const ENTRY_TYPE_LABELS: Record<ManualEntryInput['type'], string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
  debt_payment: 'Abono',
};

/**
 * Concepto por defecto cuando el usuario lo deja en blanco (§5.4, cero fricción): en un gasto, el
 * nombre de su categoría; en los demás tipos (o sin categoría), la etiqueta del tipo.
 */
export function defaultConcept(type: ManualEntryInput['type'], categoryName?: string): string {
  if (type === 'expense' && categoryName) return categoryName;
  return ENTRY_TYPE_LABELS[type];
}

/**
 * Arma el borrador según el tipo, poniendo en null lo que cada tipo no usa (§11). No valida:
 * de eso se encarga `validateTransaction` antes de persistir.
 */
export function buildManualTransactionDraft(input: ManualEntryInput): TransactionDraft {
  const base = {
    date: input.date,
    concept: input.concept.trim(),
    amount: input.amount,
    note: input.note?.trim() ? input.note.trim() : null,
    fixedMonthlyId: null,
    periodMonth: null, // entrada manual: pertenece al mes de su fecha
    adjustmentDirection: null,
    // La etiqueta hormiga solo tiene sentido en gastos.
    tags: input.type === 'expense' && input.hormiga ? [HORMIGA_TAG] : [],
  };

  switch (input.type) {
    case 'expense':
      return {
        ...base,
        type: 'expense',
        categoryId: input.categoryId,
        source: input.source,
        destination: null,
      };
    case 'income':
      return {
        ...base,
        type: 'income',
        categoryId: null,
        source: null,
        destination: input.destination,
      };
    case 'transfer':
      return {
        ...base,
        type: 'transfer',
        categoryId: null,
        source: input.source,
        destination: input.destination,
      };
    case 'debt_payment':
      return {
        ...base,
        type: 'debt_payment',
        categoryId: null,
        source: input.source,
        destination: input.destination,
      };
  }
}
