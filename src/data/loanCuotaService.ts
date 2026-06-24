// Orquesta el vínculo crédito ↔ cuota fija (CLAUDE.md §5.6). El fijo mensual es la fuente de
// verdad del estado de pago; el crédito comparte su valor de cuota. Estas funciones coordinan
// repos (fijos + crédito) para que pagar/editar en el lado del crédito refleje en el fijo y
// viceversa. No tocan saldos directo: el pago real pasa por payFixed → transactionService.
import { updateLoan } from './loanRepository';
import { updateFixedTemplate } from './fixedTemplateRepository';
import {
  generateFixedMonthly,
  listFixedMonthlyForMonth,
  payFixed,
  syncMonthlyAmount,
} from './fixedMonthlyRepository';
import type { FixedObligationTemplate, Loan } from '../domain/types';

/**
 * Paga en UN toque la cuota del mes desde la pantalla de Créditos: marca pagado el fijo ligado
 * (lo que crea el debt_payment y baja el saldo del crédito). Asegura que el fijo del mes exista
 * (lo genera si falta). No hace nada si el crédito no está ligado o la cuota ya está pagada.
 */
export async function payLinkedCuota(uid: string, loan: Loan, month: string): Promise<void> {
  if (!loan.linkedFixedTemplateId) return;
  // Idempotente: solo crea los fijos del mes que falten (incluido el de la cuota).
  await generateFixedMonthly(uid, month);
  const monthlies = await listFixedMonthlyForMonth(uid, month);
  const cuota = monthlies.find((m) => m.templateId === loan.linkedFixedTemplateId);
  if (!cuota || cuota.status === 'paid') return;
  await payFixed(uid, cuota, {
    amount: cuota.budgetedAmount,
    paymentMethod: cuota.paymentMethod,
    debtTarget: { kind: 'loan', id: loan.id },
  });
}

/**
 * Propaga el valor de la cuota del crédito al fijo ligado: actualiza el monto de la plantilla y
 * de sus instancias del mes aún no pagadas (§5.6). Se llama al crear/editar el crédito ligado.
 */
export async function syncCuotaFromLoan(
  uid: string,
  linkedFixedTemplateId: string,
  amount: number,
  month: string,
): Promise<void> {
  await updateFixedTemplate(uid, linkedFixedTemplateId, { budgetedAmount: amount });
  await syncMonthlyAmount(uid, linkedFixedTemplateId, month, amount);
}

/**
 * Propaga el monto del fijo al crédito que lo tiene ligado (si alguno): actualiza su cuota
 * mensual. Se llama al editar un fijo cuyo monto cambió (§5.6). `loans` es la lista actual.
 */
export async function syncCuotaFromTemplate(
  uid: string,
  template: FixedObligationTemplate,
  amount: number,
  loans: Loan[],
): Promise<void> {
  const linkedLoan = loans.find((l) => l.linkedFixedTemplateId === template.id);
  if (!linkedLoan || linkedLoan.monthlyPayment === amount) return;
  await updateLoan(uid, linkedLoan.id, { monthlyPayment: amount });
}
