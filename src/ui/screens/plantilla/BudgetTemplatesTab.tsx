import { useState } from 'react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useSessionStore } from '../../../store/sessionStore';
import { BudgetTemplateCard } from '../budgets/BudgetTemplateCard';
import { BudgetForm } from '../budgets/BudgetForm';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { archiveBudget, deleteBudget, subscribeBudgets } from '../../../data/budgetRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { subscribeFixedTemplates } from '../../../data/fixedTemplateRepository';
import type { Budget, Category, FixedObligationTemplate } from '../../../domain/types';

// Tab "Presupuestos" de la Plantilla (CLAUDE.md §5.9, §8.4): CRUD de los topes BASE por categoría,
// SIN barra de consumo (eso se ve por mes en /fijos). La base es con lo que arranca cada mes.
export function BudgetTemplatesTab() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: budgets, loading } = useUserCollection<Budget>(subscribeBudgets);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: templates } = useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [creating, setCreating] = useState(false);

  const active = budgets.filter((b) => !b.archived && b.active);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Categoría';
  // "Fijo ligado": la categoría tiene una plantilla de fijo respaldado (su tope lo llena ese gasto).
  const isLinked = (categoryId: string) =>
    templates.some((t) => !t.archived && (t.budgetBacked ?? false) && t.categoryId === categoryId);

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
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
        >
          + Nuevo presupuesto
        </button>
      </div>

      {loading && <p className="text-slate-400">Cargando…</p>}

      <ul className="flex flex-col gap-2">
        {active.map((budget) => (
          <BudgetTemplateCard
            key={budget.id}
            categoryName={categoryName(budget.categoryId)}
            base={budget.monthlyLimit}
            linkedToFixed={isLinked(budget.categoryId)}
            onEdit={() => setEditing(budget)}
            onArchive={() => handleArchive(budget)}
            onDelete={() => setDeleting(budget)}
          />
        ))}
      </ul>

      {!loading && active.length === 0 && (
        <p className="text-slate-500">
          Aún no tienes presupuestos por categoría. Crea uno para cuidar una categoría (opcional).
        </p>
      )}

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
    </>
  );
}
