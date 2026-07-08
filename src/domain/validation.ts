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
  | 'adjustment_requires_direction'
  | 'budget_boosts_only_on_income'
  | 'budget_boost_invalid'
  | 'foreign_amount_must_be_positive'
  | 'foreign_requires_currency'
  | 'foreign_forbidden_on_debt_payment'
  | 'foreign_requires_account_side'
  | 'destination_amount_only_on_transfer'
  | 'destination_amount_must_be_positive'
  | 'destination_foreign_amount_must_be_positive'
  | 'destination_foreign_requires_currency';

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

  // Aumentos de presupuesto ligados (§5.9): solo en ingresos; cada uno con monto entero > 0 y
  // presupuesto/mes definidos.
  if (txn.budgetBoosts && txn.budgetBoosts.length > 0) {
    if (txn.type !== 'income') {
      errors.push('budget_boosts_only_on_income');
    }
    const allValid = txn.budgetBoosts.every(
      (b) => !!b.budgetId && !!b.month && isPositiveIntegerAmount(b.amount),
    );
    if (!allValid) errors.push('budget_boost_invalid');
  }

  // Movimiento EN DIVISA (decisión 2026-07-09): las cuentas en moneda extranjera son
  // monomoneda. El monto en divisa admite decimales (la regla "entero" es solo COP), va
  // acompañado de su moneda, nunca en abonos a deuda (las deudas son COP) y su lado debe
  // ser una CUENTA según el tipo (el signo lo deriva foreignLedger.foreignDelta).
  const foreignAmount = txn.foreignAmount ?? null;
  const hasForeignAmount = foreignAmount !== null;
  const hasForeignCurrency = !!txn.foreignCurrency;
  if (hasForeignAmount || hasForeignCurrency) {
    if (foreignAmount !== null && !(Number.isFinite(foreignAmount) && foreignAmount > 0)) {
      errors.push('foreign_amount_must_be_positive');
    }
    if (hasForeignAmount !== hasForeignCurrency) {
      errors.push('foreign_requires_currency');
    }
    if (txn.type === 'debt_payment') {
      errors.push('foreign_forbidden_on_debt_payment');
    } else if (txn.type === 'income' && txn.destination?.kind !== 'account') {
      errors.push('foreign_requires_account_side');
    } else if (
      txn.type === 'expense' &&
      txn.source?.kind !== 'account' &&
      txn.source?.kind !== 'card'
    ) {
      // Un gasto en divisa sale de una cuenta en esa moneda o de una tarjeta que cobra en ella
      // (tarjeta mixta, 2026-07-07). Solo se prohíbe si el origen no es cuenta ni tarjeta.
      errors.push('foreign_requires_account_side');
    } else if (
      txn.type === 'transfer' &&
      (txn.source?.kind !== 'account' || txn.destination?.kind !== 'account')
    ) {
      errors.push('foreign_requires_account_side');
    } else if (
      txn.type === 'adjustment' &&
      txn.source?.kind !== 'account' &&
      txn.source?.kind !== 'card'
    ) {
      // Reconciliar en divisa aplica a una cuenta o a la deuda en divisa de una tarjeta.
      errors.push('foreign_requires_account_side');
    }
  }

  // Transferencia CROSS-MONEDA (montos manuales por lado): la pata de destino lleva su propio COP
  // (`destinationAmount`) y, si la cuenta destino es en divisa, su monto en esa moneda. Solo aplica
  // a transferencias; los montos deben ser válidos y la divisa acompañar a su monto.
  const destinationAmount = txn.destinationAmount ?? null;
  if (destinationAmount !== null) {
    if (txn.type !== 'transfer') {
      errors.push('destination_amount_only_on_transfer');
    }
    if (!isPositiveIntegerAmount(destinationAmount)) {
      errors.push('destination_amount_must_be_positive');
    }
  }
  const destForeignAmount = txn.destinationForeignAmount ?? null;
  const hasDestForeignAmount = destForeignAmount !== null;
  const hasDestForeignCurrency = !!txn.destinationForeignCurrency;
  if (hasDestForeignAmount || hasDestForeignCurrency) {
    if (destForeignAmount !== null && !(Number.isFinite(destForeignAmount) && destForeignAmount > 0)) {
      errors.push('destination_foreign_amount_must_be_positive');
    }
    if (hasDestForeignAmount !== hasDestForeignCurrency) {
      errors.push('destination_foreign_requires_currency');
    }
    // El monto en divisa del destino solo tiene sentido en una transferencia hacia una cuenta.
    if (txn.type !== 'transfer' || txn.destination?.kind !== 'account') {
      errors.push('foreign_requires_account_side');
    }
  }

  return errors;
}

/**
 * Mensaje en español para mostrarle un error de validación al usuario en un formulario. Vive junto
 * a los códigos (arriba) para que agregar un código nuevo recuerde darle mensaje.
 */
export function validationErrorMessage(error: ValidationError): string {
  if (error === 'amount_must_be_positive_integer') return 'Ingresa un monto válido mayor a 0.';
  if (error === 'expense_requires_category') return 'Elige una categoría.';
  if (error === 'foreign_amount_must_be_positive') return 'Ingresa un monto en divisa mayor a 0.';
  if (error === 'foreign_requires_currency') return 'Falta la moneda del monto en divisa.';
  if (error === 'foreign_forbidden_on_debt_payment')
    return 'Los abonos a deuda se hacen desde cuentas en pesos.';
  if (error === 'foreign_requires_account_side')
    return 'Un movimiento en divisa debe usar una cuenta en esa moneda.';
  if (error === 'destination_amount_must_be_positive')
    return 'Ingresa cuánto entra a la cuenta destino (mayor a 0).';
  if (error === 'destination_foreign_amount_must_be_positive')
    return 'Ingresa el monto que entra en la moneda del destino (mayor a 0).';
  if (error === 'destination_foreign_requires_currency')
    return 'Falta la moneda del monto que entra al destino.';
  if (error === 'destination_amount_only_on_transfer')
    return 'El monto de destino solo aplica a transferencias.';
  if (error.includes('source')) return 'Elige el medio de pago.';
  if (error.includes('destination')) return 'Elige el destino.';
  return 'Revisa los datos del movimiento.';
}

export function assertValidTransaction(txn: TransactionDraft): void {
  const errors = validateTransaction(txn);
  if (errors.length > 0) {
    throw new Error(`Transacción inválida: ${errors.join(', ')}`);
  }
}
