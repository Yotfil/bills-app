// Orquesta el vínculo crédito ↔ cuota fija (CLAUDE.md §5.6). El vínculo es IMPLÍCITO: un fijo
// 'abono a deuda' cuyo debtTargetId apunta al crédito ES su cuota. El fijo mensual es la fuente
// de verdad del estado de pago; el crédito comparte su valor. Estas funciones coordinan repos
// (fijos + crédito) para que pagar/editar en un lado refleje en el otro. No tocan saldos directo:
// el pago real pasa por payFixed → transactionService.
import { listAll } from './crud';
import { fixedTemplatesCol } from './collections';
import { updateLoan } from './loanRepository';
import { updateFixedTemplate } from './fixedTemplateRepository';
import {
  generateFixedMonthly,
  listFixedMonthlyForMonth,
  payFixed,
  syncMonthlyAmount,
} from './fixedMonthlyRepository';
import type { FixedObligationTemplate, Loan } from '../domain/types';

const targetsLoan = (t: FixedObligationTemplate, loanId: string): boolean =>
  !t.archived && t.payKind === 'debt_payment' && t.debtTargetId === loanId;

/**
 * Paga en UN toque la cuota del mes desde la pantalla de Créditos: marca pagado el fijo ligado
 * (lo que crea el debt_payment y baja el saldo del crédito). Asegura que el fijo del mes exista
 * (lo genera si falta). No hace nada si no hay cuota ligada o ya está pagada.
 */
export async function payLinkedCuota(uid: string, loan: Loan, month: string): Promise<void> {
  // Idempotente: solo crea los fijos del mes que falten (incluido el de la cuota).
  await generateFixedMonthly(uid, month);
  const monthlies = await listFixedMonthlyForMonth(uid, month);
  const cuota = monthlies.find((m) => m.payKind === 'debt_payment' && m.debtTargetId === loan.id);
  if (!cuota || cuota.status === 'paid') return;
  await payFixed(uid, cuota, {
    amount: cuota.budgetedAmount,
    paymentMethod: cuota.paymentMethod,
    debtTarget: { kind: 'loan', id: loan.id },
  });
}

/**
 * Propaga el valor de la cuota del crédito a los fijos ligados (abono a deuda que apuntan a él):
 * actualiza el monto de la plantilla y de sus instancias del mes aún no pagadas (§5.6). Se llama
 * al editar el crédito si cambió la cuota.
 */
export async function syncCuotaFromLoan(
  uid: string,
  loanId: string,
  amount: number,
  month: string,
): Promise<void> {
  const templates = await listAll(fixedTemplatesCol(uid));
  const linked = templates.filter((t) => targetsLoan(t, loanId));
  await Promise.all(
    linked.map(async (t) => {
      await updateFixedTemplate(uid, t.id, { budgetedAmount: amount });
      await syncMonthlyAmount(uid, t.id, month, amount);
    }),
  );
}

/**
 * Propaga el monto del fijo al crédito que apunta (si el destino es un crédito): actualiza su
 * cuota mensual (§5.6). Se llama al editar un fijo cuyo monto cambió. `loans` es la lista actual.
 */
export async function syncCuotaFromTemplate(
  uid: string,
  template: FixedObligationTemplate,
  amount: number,
  loans: Loan[],
): Promise<void> {
  if (template.payKind !== 'debt_payment' || !template.debtTargetId) return;
  const linkedLoan = loans.find((l) => l.id === template.debtTargetId);
  if (!linkedLoan || linkedLoan.monthlyPayment === amount) return;
  await updateLoan(uid, linkedLoan.id, { monthlyPayment: amount });
}
