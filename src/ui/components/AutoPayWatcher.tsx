import { useEffect, useRef } from 'react';
import { useUserCollection } from '../hooks/useUserCollection';
import { useFixedMonthly } from '../hooks/useFixedMonthly';
import { useSessionStore } from '../../store/sessionStore';
import { subscribeCards } from '../../data/cardRepository';
import { subscribeLoans } from '../../data/loanRepository';
import { autoPayDueFixeds } from '../../data/autoPayService';
import { isAutoPayDue } from '../../domain/autoPay';
import { currentMonthKey } from '../../lib/date';
import type { CreditCard, Loan } from '../../domain/types';

// Auto-registro de gastos fijos en su día de cobro (CLAUDE.md §5.3). Sin servidor: corre al ABRIR la
// app. Al cargar el mes en curso, registra los fijos cuyo día ya llegó (`isAutoPayDue`). Idempotente:
// el guard `autoPaidAt` en Firestore evita repetir (incluso tras "Deshacer pago"); el `attempted` ref
// evita disparar dos veces mientras la suscripción refleja el pago. Se monta una vez en el layout.
export function AutoPayWatcher() {
  const uid = useSessionStore((s) => s.user?.uid);
  const month = currentMonthKey();
  const { items: fijos, loading } = useFixedMonthly(month);
  const { items: cards, loading: cardsLoading } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans, loading: loansLoading } = useUserCollection<Loan>(subscribeLoans);
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!uid || loading || cardsLoading || loansLoading) return;
    const now = new Date();
    const todayDay = now.getDate();
    // Último día del mes en curso (para disparar días 29–31 en meses cortos).
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const due = fijos.filter(
      (f) => isAutoPayDue(f, todayDay, daysInMonth) && !attempted.current.has(f.id),
    );
    if (due.length === 0) return;
    due.forEach((f) => attempted.current.add(f.id));
    void autoPayDueFixeds(uid, due, todayDay, cards, loans, daysInMonth);
  }, [uid, loading, cardsLoading, loansLoading, fijos, cards, loans]);

  return null;
}
