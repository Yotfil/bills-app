import { useState } from 'react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useSessionStore } from '../../../store/sessionStore';
import { CategoryForm } from './CategoryForm';
import { BackButton } from '../../components/BackButton';
import { ActionMenu } from '../../components/ActionMenu';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { categoryHasMovements } from '../../../domain/entityUsage';
import {
  archiveCategory,
  deleteCategory,
  subscribeCategories,
} from '../../../data/categoryRepository';
import { subscribeTransactions } from '../../../data/transactionRepository';
import type { Category, Transaction } from '../../../domain/types';

// CRUD de categorías (CLAUDE.md §6, §8.4). Las del usuario se editan/archivan/eliminan; la de
// sistema ("Ajuste / Reconciliación") es de solo lectura. Eliminar requiere no tener movimientos.
export function CategoriesScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: categories, loading } = useUserCollection<Category>(subscribeCategories);
  const { items: transactions } = useUserCollection<Transaction>(subscribeTransactions);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const active = categories.filter((c) => !c.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  const userCategories = active.filter((c) => !c.isSystem);
  const systemCategories = active.filter((c) => c.isSystem);
  const nextSortOrder = active.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;

  async function handleArchive(category: Category) {
    if (!uid) return;
    if (!confirm(`¿Archivar la categoría "${category.name}"? Su histórico se conserva.`)) return;
    await archiveCategory(uid, category.id);
  }

  // El borrado físico solo procede si la categoría NO tiene movimientos (§8.4).
  const deletingBlocked = deleting ? categoryHasMovements(transactions, deleting.id) : false;

  async function handleDelete() {
    if (!uid || !deleting) return;
    await deleteCategory(uid, deleting.id);
    setDeleting(null);
  }

  async function handleArchiveFromModal() {
    if (!uid || !deleting) return;
    await archiveCategory(uid, deleting.id);
    setDeleting(null);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton />
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Categorías</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
        >
          + Nueva
        </button>
      </header>

      {loading && <p className="text-slate-400">Cargando…</p>}

      <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {userCategories.map((category) => (
          <li
            key={category.id}
            className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-0"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
              style={{ backgroundColor: `${category.color}20` }}
            >
              {category.icon}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
              {category.name}
            </span>
            <ActionMenu
              ariaLabel={`Acciones de ${category.name}`}
              items={[
                { label: 'Editar', icon: '✏️', onSelect: () => setEditing(category) },
                { label: 'Archivar', icon: '📦', onSelect: () => handleArchive(category) },
                {
                  label: 'Eliminar',
                  icon: '🗑️',
                  onSelect: () => setDeleting(category),
                  danger: true,
                },
              ]}
            />
          </li>
        ))}
      </ul>

      {systemCategories.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-semibold text-slate-400 uppercase">Del sistema</h2>
          <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {systemCategories.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-0"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  {category.icon}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                  {category.name}
                </span>
                <span className="shrink-0 text-xs text-slate-400">No editable</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CategoryForm
        key={`create-${creating}`}
        open={creating}
        nextSortOrder={nextSortOrder}
        onClose={() => setCreating(false)}
      />
      <CategoryForm
        key={editing?.id ?? 'edit-none'}
        open={!!editing}
        category={editing}
        nextSortOrder={nextSortOrder}
        onClose={() => setEditing(null)}
      />
      <ConfirmDeleteModal
        open={!!deleting}
        itemLabel={deleting?.name ?? ''}
        itemKind="la categoría"
        blocked={deletingBlocked}
        onConfirm={() => void handleDelete()}
        onArchive={() => void handleArchiveFromModal()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
