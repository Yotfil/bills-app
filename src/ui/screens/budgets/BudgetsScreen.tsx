import { useMemo, useState } from 'react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useFixedMonthly } from '../../hooks/useFixedMonthly';
import { useSessionStore } from '../../../store/sessionStore';
import { BudgetCard } from './BudgetCard';
import { BudgetForm } from './BudgetForm';
import { BackButton } from '../../components/BackButton';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { budgetStatus } from '../../../domain/reports';
import { linkedBudgetBackedFixed } from '../../../domain/budgetBackedFixed';
import { currentMonthKey, monthKey } from '../../../lib/date';
import { archiveBudget, deleteBudget, subscribeBudgets } from '../../../data/budgetRepository';
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
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [creating, setCreating] = useState(false);

  const active = budgets.filter((b) => !b.archived && b.active);
  const month = currentMonthKey();
  const { items: monthlyFixeds } = useFixedMonthly(month);
  const monthTxns = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month],
  );
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Categoría';

  // Para una categoría con fijo respaldado, el tope POR MES vive en ese fijo (M), no en el tope
  // global del presupuesto (§5.9): así presupuesto y fijo del mes muestran SIEMPRE el mismo número.
  const linkedFixedFor = (categoryId: string) => linkedBudgetBackedFixed(categoryId, monthlyFixeds);

  async function handleArchive(budget: Budget) {
    if (!uid) return;
    if (!confirm('¿Archivar este presupuesto?')) return;
    await archiveBudget(uid, budget.id);
  }

  // Un presupuesto es solo un tope: ningún movimiento lo referencia, así que se borra siempre (§8.4).
  async function handleDelete() {
    if (!uid || !deleting) return;
    await deleteBudget(uid, deleting.id);
    setDeleting(null);
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
        {active.map((budget) => {
          const linkedFixed = linkedFixedFor(budget.categoryId);
          const limit = linkedFixed?.budgetedAmount ?? budget.monthlyLimit;
          return (
            <BudgetCard
              key={budget.id}
              categoryName={categoryName(budget.categoryId)}
              status={budgetStatus(monthTxns, budget.categoryId, limit)}
              linkedToFixed={!!linkedFixed}
              onEdit={() => setEditing(budget)}
              onArchive={() => handleArchive(budget)}
              onDelete={() => setDeleting(budget)}
            />
          );
        })}
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
      <ConfirmDeleteModal
        open={!!deleting}
        itemLabel={deleting ? categoryName(deleting.categoryId) : ''}
        itemKind="el presupuesto"
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
