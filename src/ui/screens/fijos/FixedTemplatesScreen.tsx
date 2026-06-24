import { useState } from 'react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useSessionStore } from '../../../store/sessionStore';
import { FixedTemplateForm } from './FixedTemplateForm';
import { BackButton } from '../../components/BackButton';
import { SearchBar } from '../../components/SearchBar';
import { ActionMenu } from '../../components/ActionMenu';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { formatCop } from '../../../lib/currency';
import { matchesQuery } from '../../../lib/text';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeCards } from '../../../data/cardRepository';
import { subscribeLoans } from '../../../data/loanRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import {
  archiveFixedTemplate,
  deleteFixedTemplate,
  subscribeFixedTemplates,
} from '../../../data/fixedTemplateRepository';
import type {
  Account,
  Category,
  CreditCard,
  FixedObligationTemplate,
  Loan,
} from '../../../domain/types';

// Plantilla de obligaciones fijas (CLAUDE.md §8.4): CRUD. Desde aquí se generan los fijos de
// cada mes en la pantalla de Fijos.
export function FixedTemplatesScreen() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: templates, loading } =
    useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans } = useUserCollection<Loan>(subscribeLoans);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const [editing, setEditing] = useState<FixedObligationTemplate | null>(null);
  const [deleting, setDeleting] = useState<FixedObligationTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const allActive = templates.filter((t) => !t.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  const active = allActive.filter((t) => matchesQuery(search, t.name));
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name;

  async function handleArchive(template: FixedObligationTemplate) {
    if (!uid) return;
    if (!confirm(`¿Archivar el fijo "${template.name}"? No se generará en próximos meses.`)) return;
    await archiveFixedTemplate(uid, template.id);
  }

  // La plantilla es solo el molde del rollover; las instancias mensuales son snapshots
  // autocontenidos, así que borrarla no rompe el histórico (§8.4): se puede eliminar siempre.
  async function handleDelete() {
    if (!uid || !deleting) return;
    await deleteFixedTemplate(uid, deleting.id);
    setDeleting(null);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
      <BackButton />
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Obligaciones fijas</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
        >
          + Nuevo
        </button>
      </header>

      {allActive.length > 0 && (
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar obligación…" />
      )}

      {loading && <p className="text-slate-400">Cargando…</p>}
      {!loading && allActive.length === 0 && (
        <p className="text-slate-500">Aún no tienes obligaciones fijas. Crea la primera.</p>
      )}
      {!loading && allActive.length > 0 && active.length === 0 && (
        <p className="text-slate-500">Ninguna obligación coincide con “{search}”.</p>
      )}

      <ul className="flex flex-col gap-2">
        {active.map((template) => (
          <li
            key={template.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800">{template.name}</p>
              <p className="text-xs text-slate-400">
                {formatCop(template.budgetedAmount)} ·{' '}
                {template.payKind === 'debt_payment'
                  ? 'Abono a deuda'
                  : (categoryName(template.categoryId) ?? 'Gasto')}
              </p>
            </div>
            <ActionMenu
              ariaLabel={`Acciones de ${template.name}`}
              items={[
                { label: 'Editar', icon: '✏️', onSelect: () => setEditing(template) },
                { label: 'Archivar', icon: '📦', onSelect: () => handleArchive(template) },
                {
                  label: 'Eliminar',
                  icon: '🗑️',
                  onSelect: () => setDeleting(template),
                  danger: true,
                },
              ]}
            />
          </li>
        ))}
      </ul>

      <FixedTemplateForm
        key={`create-${creating}`}
        open={creating}
        accounts={accounts}
        cards={cards}
        loans={loans}
        categories={categories}
        onClose={() => setCreating(false)}
      />
      <FixedTemplateForm
        key={editing?.id ?? 'edit-none'}
        open={!!editing}
        template={editing}
        accounts={accounts}
        cards={cards}
        loans={loans}
        categories={categories}
        onClose={() => setEditing(null)}
      />
      <ConfirmDeleteModal
        open={!!deleting}
        itemLabel={deleting?.name ?? ''}
        itemKind="la obligación fija"
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
