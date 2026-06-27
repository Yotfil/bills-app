// Validación de transacciones (CLAUDE.md §11). Reglas puras y testeables: una transacción
// inválida NO se debe poder guardar. `validateTransaction` devuelve la lista de errores
// (vacía = válida); `assertValidTransaction` lanza si hay alguno.
import type { TransactionDraft } from './types';

export type ValidationError =
  | 'amount_must_be_positive_integer'
  | 'expense_requires_account_or_card_source'
  | 'expense_requires_category'
  | 'expense_forbids_destination'
  | 'expense_forbids_adjustment_direction'
  | 'income_requires_account_destination'
  | 'income_forbids_source'
  | 'transfer_requires_account_source'
  | 'transfer_requires_distinct_account_destination'
  | 'debt_payment_requires_account_source'
  | 'debt_payment_requires_card_or_loan_destination'
  | 'adjustment_requires_source'
  | 'adjustment_requires_category'
  | 'adjustment_requires_direction';

/** El monto se guarda como entero de pesos, SIEMPRE positivo (CLAUDE.md §3, §11). */
function isPositiveIntegerAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

export function validateTransaction(txn: TransactionDraft): ValidationError[] {
  const errors: ValidationError[] = [];

  // Regla común a todos los tipos.
  if (!isPositiveIntegerAmount(txn.amount)) {
    errors.push('amount_must_be_positive_integer');
  }

  switch (txn.type) {
    case 'expense': {
      if (txn.source?.kind !== 'account' && txn.source?.kind !== 'card') {
        errors.push('expense_requires_account_or_card_source');
      }
      if (!txn.categoryId) {
        errors.push('expense_requires_category');
      }
      if (txn.destination !== null) {
        errors.push('expense_forbids_destination');
      }
      if (txn.adjustmentDirection !== null) {
        errors.push('expense_forbids_adjustment_direction');
      }
      break;
    }
    case 'income': {
      if (txn.destination?.kind !== 'account') {
        errors.push('income_requires_account_destination');
      }
      if (txn.source !== null) {
        errors.push('income_forbids_source');
      }
      break;
    }
    case 'transfer': {
      if (txn.source?.kind !== 'account') {
        errors.push('transfer_requires_account_source');
      }
      // Destino debe ser una cuenta DISTINTA del origen.
      if (
        txn.destination?.kind !== 'account' ||
        (txn.source?.kind === 'account' && txn.source.id === txn.destination.id)
      ) {
        errors.push('transfer_requires_distinct_account_destination');
      }
      break;
    }
    case 'debt_payment': {
      if (txn.source?.kind !== 'account') {
        errors.push('debt_payment_requires_account_source');
      }
      if (txn.destination?.kind !== 'card' && txn.destination?.kind !== 'loan') {
        errors.push('debt_payment_requires_card_or_loan_destination');
      }
      break;
    }
    case 'adjustment': {
      // El ajuste reconcilia una cuenta (saldo), una tarjeta (deuda) o un crédito (saldo), §5.7.
      const kind = txn.source?.kind;
      if (kind !== 'account' && kind !== 'card' && kind !== 'loan') {
        errors.push('adjustment_requires_source');
      }
      // Debe usar la categoría de sistema "Ajuste / Reconciliación" (su id lo pone quien
      // crea el movimiento). Aquí exigimos que venga una categoría.
      if (!txn.categoryId) {
        errors.push('adjustment_requires_category');
      }
      if (txn.adjustmentDirection !== 'increase' && txn.adjustmentDirection !== 'decrease') {
        errors.push('adjustment_requires_direction');
      }
      break;
    }
  }

  return errors;
}

export function assertValidTransaction(txn: TransactionDraft): void {
  const errors = validateTransaction(txn);
  if (errors.length > 0) {
    throw new Error(`Transacción inválida: ${errors.join(', ')}`);
  }
}
