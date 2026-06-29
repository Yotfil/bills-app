import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { useUserCollection } from '../hooks/useUserCollection';
import { useFixedMonthly } from '../hooks/useFixedMonthly';
import { useSessionStore } from '../../store/sessionStore';
import { useBudgetAlertStore } from '../../store/budgetAlertStore';
import { subscribeBudgets } from '../../data/budgetRepository';
import { subscribeCategories } from '../../data/categoryRepository';
import { subscribeTransactions } from '../../data/transactionRepository';
import { budgetStatus } from '../../domain/reports';
import { budgetAlertLevel, budgetAlertRank } from '../../domain/budgetAlert';
import { budgetCapForMonth, fixedCap, linkedBudgetBackedFixed } from '../../domain/budgetBackedFixed';
import { formatCop } from '../../lib/currency';
import { NEAR_LIMIT_RATIO } from '../../lib/progress';
import { currentMonthKey, transactionPeriodMonth } from '../../lib/date';
import type { AcknowledgedLevel } from '../../store/BudgetAlertState';
import type { Budget, Category, Transaction } from '../../domain/types';

// Aviso emergente que sale APENAS un presupuesto alcanza el 80% del tope (o lo excede), una sola vez
// por presupuesto y nivel (CLAUDE.md §5.9). Se monta una vez en el layout para vigilar en toda la app.
// Los pendientes se derivan en el render (sin efectos): el modal aparece mientras haya un cruce no
// confirmado y desaparece cuando el usuario toca "Entendido" (que marca el aviso como mostrado).
interface PendingAlert {
  key: string;
  level: AcknowledgedLevel;
  categoryName: string;
  consumed: number;
  cap: number;
}

export function BudgetAlertWatcher() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: budgets } = useUserCollection<Budget>(subscribeBudgets);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const month = currentMonthKey();
  const { items: monthlyFixeds } = useFixedMonthly(month);
  const acknowledged = useBudgetAlertStore((s) => s.acknowledged);
  const acknowledge = useBudgetAlertStore((s) => s.acknowledge);

  // Consumo por MES CONTABLE (periodMonth), igual que el resto de presupuestos (§5.9).
  const monthTxns = transactions.filter((t) => transactionPeriodMonth(t) === month);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Categoría';

  const pending: PendingAlert[] = [];
  if (uid) {
    for (const b of budgets) {
      if (b.archived || !b.active) continue;
      // El tope efectivo del mes es el del fijo respaldado si lo hay (override del mes o base); si no,
      // el del presupuesto.
      const linked = linkedBudgetBackedFixed(b.categoryId, monthlyFixeds);
      const cap = linked ? fixedCap(linked) : budgetCapForMonth(b, month);
      const consumed = budgetStatus(monthTxns, b.categoryId, 0).consumed;
      const level = budgetAlertLevel(consumed, cap, NEAR_LIMIT_RATIO);
      if (level === 'none') continue;
      const key = `${month}:${b.id}`;
      if (budgetAlertRank(level) > budgetAlertRank(acknowledged[key] ?? 'none')) {
        pending.push({ key, level, categoryName: categoryName(b.categoryId), consumed, cap });
      }
    }
  }

  function handleAck() {
    pending.forEach((p) => acknowledge(p.key, p.level));
  }

  return (
    <Modal open={pending.length > 0} title="Alerta de topes" onClose={handleAck}>
      <ul className="flex flex-col gap-2">
        {pending.map((p) => {
          const exceeded = p.level === 'exceeded';
          const pct = p.cap > 0 ? Math.round((p.consumed / p.cap) * 100) : 0;
          return (
            <li
              key={p.key}
              className={`flex items-start gap-2 rounded-xl border p-3 ${
                exceeded ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'
              }`}
            >
              <AlertTriangle
                className={`mt-0.5 h-5 w-5 shrink-0 ${exceeded ? 'text-red-600' : 'text-orange-600'}`}
              />
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${exceeded ? 'text-red-800' : 'text-orange-800'}`}>
                  {exceeded ? `¡Te pasaste del tope de ${p.categoryName}!` : `${p.categoryName}: vas en ${pct}%`}
                </p>
                <p className={`text-xs ${exceeded ? 'text-red-600' : 'text-orange-600'}`}>
                  {exceeded
                    ? `Te excediste ${formatCop(p.consumed - p.cap)} (tope ${formatCop(p.cap)})`
                    : `Quedan ${formatCop(p.cap - p.consumed)} de ${formatCop(p.cap)}. ¡Cuidado para no pasarte!`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={handleAck}
        className="mt-4 w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-white"
      >
        Entendido
      </button>
    </Modal>
  );
}
