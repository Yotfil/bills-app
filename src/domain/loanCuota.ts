import type { FixedObligationMonthly, FixedObligationTemplate, Loan } from './types';

// Vínculo crédito ↔ cuota fija (§5.6), IMPLÍCITO por `debtTargetId`. Un fijo de tipo
// 'abono a deuda' que apunta a un crédito ES su cuota: el estado de pago del mes se DERIVA del
// fijo mensual correspondiente, así pagar/deshacer en cualquiera de los dos lados queda reflejado
// en el otro sin duplicar la fuente de verdad. No hace falta configurar nada en el crédito.

/** Un fijo de tipo abono a deuda que apunta a este crédito. */
const targetsLoan = (
  item: { payKind: string; debtTargetId: string | null },
  loanId: string,
): boolean => item.payKind === 'debt_payment' && item.debtTargetId === loanId;

/**
 * `true` si el crédito tiene una cuota ligada: existe una plantilla de fijo (no archivada) de
 * tipo abono a deuda que apunta a él. Sirve para decidir si la tarjeta muestra el estado del mes.
 */
export function loanHasLinkedFixed(loan: Loan, templates: FixedObligationTemplate[]): boolean {
  return templates.some((t) => !t.archived && targetsLoan(t, loan.id));
}

/**
 * Devuelve la instancia mensual del fijo ligado a este crédito para el mes ya cargado, o `null`
 * si no hay ninguna (no ligado, o aún no se generó). `monthlies` es la lista del mes que interesa.
 */
export function linkedMonthlyCuota(
  loan: Loan,
  monthlies: FixedObligationMonthly[],
): FixedObligationMonthly | null {
  return monthlies.find((m) => targetsLoan(m, loan.id)) ?? null;
}

/** `true` si la cuota del mes (el fijo ligado) ya está pagada. */
export function isLoanCuotaPaid(loan: Loan, monthlies: FixedObligationMonthly[]): boolean {
  return linkedMonthlyCuota(loan, monthlies)?.status === 'paid';
}
