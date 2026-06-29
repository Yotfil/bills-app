import { useMemo, useState } from 'react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { BackButton } from '../../components/BackButton';
import { MonthSelector } from '../../components/MonthSelector';
import { BudgetHistoryRow } from './BudgetHistoryRow';
import { budgetStatus } from '../../../domain/reports';
import { budgetCapForMonth } from '../../../domain/budgetBackedFixed';
import { formatCop } from '../../../lib/currency';
import { addMonths, currentMonthKey, transactionPeriodMonth } from '../../../lib/date';
import { subscribeBudgets } from '../../../data/budgetRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import type { Budget, Category, Transaction } from '../../../domain/types';

// Histórico de presupuestos (CLAUDE.md §5.9, §8.4): el gasto de cada categoría con tope en meses
// anteriores. Los presupuestos se reinician cada mes (§5.10); aquí se mira hacia atrás. El consumo
// se calcula sobre los movimientos del mes seleccionado; el tope del mes es el del fijo respaldado
// generado ese mes (snapshot) o, si no había, el tope actual del presupuesto (mejor aproximación).
export function BudgetHistoryScreen() {
  const { items: budgets } = useUserCollection<Budget>(subscribeBudgets);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  // Arranca en el mes ANTERIOR (es un histórico).
  const [month, setMonth] = useState(addMonths(currentMonthKey(), -1));

  const active = budgets.filter((b) => !b.archived && b.active);
  // Consumo por MES CONTABLE (periodMonth): un fijo pagado por adelantado pertenece a su mes (§5.9).
  const monthTxns = useMemo(
    () => transactions.filter((t) => transactionPeriodMonth(t) === month),
    [transactions, month],
  );
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Categoría';

  const rows = active.map((budget) => {
    // Tope efectivo de ESE mes: del `Budget` (override del mes o base, §5.9).
    const limit = budgetCapForMonth(budget, month);
    return {
      id: budget.id,
      categoryName: categoryName(budget.categoryId),
      status: budgetStatus(monthTxns, budget.categoryId, limit),
      linkedToFixed: budget.inChecklist ?? false,
    };
  });
  const totalSpent = rows.reduce((sum, r) => sum + r.status.consumed, 0);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton />
      <header>
        <h1 className="text-xl font-bold text-slate-800">Histórico de presupuestos</h1>
        <p className="text-sm text-slate-400">Gastos por categoría en meses anteriores.</p>
      </header>

      <MonthSelector
        month={month}
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
      />

      {active.length === 0 ? (
        <p className="text-slate-500">Aún no tienes presupuestos para mostrar histórico.</p>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
            <span className="text-sm text-slate-500">Gastado en presupuestos</span>
            <span className="text-sm font-semibold text-slate-800">{formatCop(totalSpent)}</span>
          </div>
          <ul className="flex flex-col gap-3">
            {rows.map((r) => (
              <BudgetHistoryRow
                key={r.id}
                categoryName={r.categoryName}
                status={r.status}
                linkedToFixed={r.linkedToFixed}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
