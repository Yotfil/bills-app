import { useState } from 'react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useSessionStore } from '../../../store/sessionStore';
import { FixedTemplateForm } from './FixedTemplateForm';
import { BackButton } from '../../components/BackButton';
import { formatCop } from '../../../lib/currency';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeCards } from '../../../data/cardRepository';
import { subscribeLoans } from '../../../data/loanRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import {
  archiveFixedTemplate,
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
  const [creating, setCreating] = useState(false);

  const active = templates.filter((t) => !t.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name;

  async function handleArchive(template: FixedObligationTemplate) {
    if (!uid) return;
    if (!confirm(`¿Archivar el fijo "${template.name}"? No se generará en próximos meses.`)) return;
    await archiveFixedTemplate(uid, template.id);
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

      {loading && <p className="text-slate-400">Cargando…</p>}
      {!loading && active.length === 0 && (
        <p className="text-slate-500">Aún no tienes obligaciones fijas. Crea la primera.</p>
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
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setEditing(template)}
                className="text-slate-500 underline"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => handleArchive(template)}
                className="text-slate-400 underline"
              >
                Archivar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <FixedTemplateForm
        open={creating}
        accounts={accounts}
        cards={cards}
        loans={loans}
        categories={categories}
        onClose={() => setCreating(false)}
      />
      <FixedTemplateForm
        open={!!editing}
        template={editing}
        accounts={accounts}
        cards={cards}
        loans={loans}
        categories={categories}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
