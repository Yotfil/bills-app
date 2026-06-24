import { useMemo, useState } from 'react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useSessionStore } from '../../../store/sessionStore';
import { BudgetCard } from './BudgetCard';
import { BudgetForm } from './BudgetForm';
import { BackButton } from '../../components/BackButton';
import { budgetStatus } from '../../../domain/reports';
import { currentMonthKey, monthKey } from '../../../lib/date';
import { archiveBudget, subscribeBudgets } from '../../../data/budgetRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import type { Budget, Category, Transaction } from '../../../domain/types';

// Presupuestos por categoría (CLAUDE.md §5.9, §8.4). El consumo se calcula sobre los gastos
// del MES ACTUAL; el tope se reinicia cada mes (§5.10).
export function BudgetsScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: budgets, loading } = useUserCollection<Budget>(subscribeBudgets);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [creating, setCreating] = useState(false);

  const active = budgets.filter((b) => !b.archived && b.active);
  const month = currentMonthKey();
  const monthTxns = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month],
  );
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Categoría';

  async function handleArchive(budget: Budget) {
    if (!uid) return;
    if (!confirm('¿Archivar este presupuesto?')) return;
    await archiveBudget(uid, budget.id);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton />
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Presupuestos</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
        >
          + Nuevo
        </button>
      </header>

      {loading && <p className="text-slate-400">Cargando…</p>}
      {!loading && active.length === 0 && (
        <p className="text-slate-500">
          Aún no tienes presupuestos. Crea uno para cuidar una categoría (opcional).
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {active.map((budget) => (
          <BudgetCard
            key={budget.id}
            categoryName={categoryName(budget.categoryId)}
            status={budgetStatus(monthTxns, budget.categoryId, budget.monthlyLimit)}
            onEdit={() => setEditing(budget)}
            onArchive={() => handleArchive(budget)}
          />
        ))}
      </ul>

      <BudgetForm
        key={`create-${creating}`}
        open={creating}
        categories={categories}
        usedCategoryIds={active.map((b) => b.categoryId)}
        onClose={() => setCreating(false)}
      />
      <BudgetForm
        key={editing?.id ?? 'edit-none'}
        open={!!editing}
        budget={editing}
        categories={categories}
        usedCategoryIds={active.map((b) => b.categoryId)}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
