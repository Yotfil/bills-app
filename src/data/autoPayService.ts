// Auto-registro de gastos fijos en su día de cobro (§5.3). Recorre los fijos del mes en curso y, para
// los que toca hoy (`isAutoPayDue`), crea el movimiento con su monto/medio configurados reusando
// `payFixed` (atómico: baja saldo, marca pagado, setea el guard `autoPaidAt`). Para abonos a deuda,
// resuelve el destino (tarjeta/crédito) por `debtTargetId`. Lo dispara el watcher al abrir la app.
import { payFixed } from './fixedMonthlyRepository';
import { isAutoPayDue } from '../domain/autoPay';
import type { CreditCard, EntityRef, FixedObligationMonthly, Loan } from '../domain/types';

/** Auto-registra los fijos que toca hoy. Devuelve cuántos pagó. */
export async function autoPayDueFixeds(
  uid: string,
  fijos: FixedObligationMonthly[],
  todayDay: number,
  cards: CreditCard[],
  loans: Loan[],
  daysInMonth = 31,
): Promise<number> {
  let paid = 0;
  for (const f of fijos) {
    if (!isAutoPayDue(f, todayDay, daysInMonth)) continue;

    let debtTarget: EntityRef | null = null;
    if (f.payKind === 'debt_payment') {
      const card = cards.find((c) => c.id === f.debtTargetId);
      const loan = loans.find((l) => l.id === f.debtTargetId);
      debtTarget = card
        ? { kind: 'card', id: card.id }
        : loan
          ? { kind: 'loan', id: loan.id }
          : null;
      if (!debtTarget) continue; // sin destino válido no se puede auto-pagar el abono
    }

    await payFixed(
      uid,
      f,
      { amount: f.budgetedAmount, paymentMethod: f.paymentMethod, debtTarget },
      { auto: true },
    );
    paid += 1;
  }
  return paid;
}
