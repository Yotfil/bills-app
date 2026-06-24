import type { FixedObligationMonthly, Loan } from './types';

// Vínculo crédito ↔ cuota fija (§5.6). Un crédito puede ligarse a un fijo (su cuota mensual);
// el estado de pago del mes se DERIVA del fijo mensual correspondiente, así pagar/deshacer en
// cualquiera de los dos lados queda reflejado en el otro sin duplicar la fuente de verdad.

/**
 * Devuelve la instancia mensual del fijo ligado a este crédito para el mes ya cargado, o `null`
 * si el crédito no está ligado o aún no se generó ese fijo del mes. `monthlies` debe ser la lista
 * de fijos del mes que interesa (la pantalla ya la trae filtrada por mes).
 */
export function linkedMonthlyCuota(
  loan: Loan,
  monthlies: FixedObligationMonthly[],
): FixedObligationMonthly | null {
  if (!loan.linkedFixedTemplateId) return null;
  return monthlies.find((m) => m.templateId === loan.linkedFixedTemplateId) ?? null;
}

/** `true` si la cuota del mes (el fijo ligado) ya está pagada. */
export function isLoanCuotaPaid(loan: Loan, monthlies: FixedObligationMonthly[]): boolean {
  return linkedMonthlyCuota(loan, monthlies)?.status === 'paid';
}
