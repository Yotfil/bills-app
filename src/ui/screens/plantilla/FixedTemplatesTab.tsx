import { useState } from 'react';
import { useUserCollection } from '../../hooks/useUserCollection';
import { useSessionStore } from '../../../store/sessionStore';
import { FixedTemplateForm } from '../fijos/FixedTemplateForm';
import { Pencil, Archive, Trash2 } from 'lucide-react';
import { SearchBar } from '../../components/SearchBar';
import { ActionMenu } from '../../components/ActionMenu';
import { BulkSelectBar } from '../../components/BulkSelectBar';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { formatCop } from '../../../lib/currency';
import { matchesQuery } from '../../../lib/text';
import { subscribeAccounts } from '../../../data/accountRepository';
import { subscribeCards } from '../../../data/cardRepository';
import { subscribeLoans } from '../../../data/loanRepository';
import { subscribeCategories } from '../../../data/categoryRepository';
import { subscribeBudgets } from '../../../data/budgetRepository';
import {
  archiveFixedTemplate,
  deleteFixedTemplate,
  subscribeFixedTemplates,
} from '../../../data/fixedTemplateRepository';
import type {
  Account,
  Budget,
  Category,
  CreditCard,
  FixedObligationTemplate,
  Loan,
} from '../../../domain/types';

// Criterios de orden de la lista de plantillas. "category" agrupa por categoría (mismas
// categorías quedan contiguas) y dentro de cada grupo ordena por nombre.
type TemplateSort = 'name-asc' | 'name-desc' | 'category';

// Tab "Gastos" de la Plantilla (CLAUDE.md §8.4): CRUD de obligaciones fijas. Es la PLANTILLA
// (valores base con los que arranca cada mes); el detalle por mes se ve/edita en /fijos.
export function FixedTemplatesTab() {
  const uid = useSessionStore((s) => s.user?.uid);
  const { items: templates, loading } =
    useUserCollection<FixedObligationTemplate>(subscribeFixedTemplates);
  const { items: accounts } = useUserCollection<Account>(subscribeAccounts);
  const { items: cards } = useUserCollection<CreditCard>(subscribeCards);
  const { items: loans } = useUserCollection<Loan>(subscribeLoans);
  const { items: categories } = useUserCollection<Category>(subscribeCategories);
  const { items: budgets } = useUserCollection<Budget>(subscribeBudgets);
  const [editing, setEditing] = useState<FixedObligationTemplate | null>(null);
  const [deleting, setDeleting] = useState<FixedObligationTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<TemplateSort>('name-asc');
  // Selección para acciones masivas (§8.4). Guarda los ids marcados; el borrado masivo los
  // elimina en paralelo. Las plantillas se pueden borrar siempre (son moldes, no histórico).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Las plantillas respaldadas (Opción C) ya no son gastos fijos: viven como presupuesto de checklist
  // en el tab Presupuestos. Se ocultan aquí (quedan dormidas hasta el PR de limpieza).
  const allActive = templates
    .filter((t) => !t.archived && !(t.budgetBacked ?? false))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const active = allActive.filter((t) => matchesQuery(search, t.name));
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name;
  // Etiqueta usada para agrupar/ordenar por categoría: los abonos a deuda no tienen categoría,
  // así que se agrupan bajo "Abono a deuda" (igual que su subtítulo en la fila).
  const groupLabel = (t: FixedObligationTemplate) =>
    t.payKind === 'debt_payment' ? 'Abono a deuda' : (categoryName(t.categoryId) ?? 'Sin categoría');

  // Lista visible ya ordenada según el criterio elegido. La selección masiva trabaja sobre el
  // mismo conjunto `active`, así que reordenar no afecta el conteo ni "seleccionar todas".
  const sortedActive = [...active].sort((a, b) => {
    if (sort === 'name-desc') return b.name.localeCompare(a.name);
    if (sort === 'category') return groupLabel(a).localeCompare(groupLabel(b)) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });

  // Total de lo que suman las obligaciones visibles (respeta el buscador). Los fijos que CONSUMEN de
  // un presupuesto (§5.9 ext.) NO se suman: su monto ya está dentro de la bolsa de su categoría,
  // contarlos aparte duplicaría. Siguen apareciendo en la lista, solo no en el total.
  const summable = active.filter((t) => !(t.consumesBudget ?? false));
  const visibleTotal = summable.reduce((sum, t) => sum + t.budgetedAmount, 0);

  // La selección se cuenta solo sobre lo VISIBLE (respeta el filtro de búsqueda): así
  // "seleccionar todas" y el conteo no incluyen ítems ocultos por el buscador.
  const visibleSelectedCount = active.filter((t) => selected.has(t.id)).length;
  const allVisibleSelected = active.length > 0 && visibleSelectedCount === active.length;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) active.forEach((t) => next.delete(t.id));
      else active.forEach((t) => next.add(t.id));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleBulkDelete() {
    if (!uid) return;
    const ids = active.filter((t) => selected.has(t.id)).map((t) => t.id);
    await Promise.all(ids.map((id) => deleteFixedTemplate(uid, id)));
    clearSelection();
    setBulkDeleting(false);
  }

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
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
        >
          + Nuevo gasto fijo
        </button>
      </div>

      {allActive.length > 0 && (
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar obligación…" />
      )}

      {active.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs text-slate-400">
              Total · {summable.length} {summable.length === 1 ? 'fijo' : 'fijos'}
            </p>
            <p className="text-lg font-bold text-slate-800">{formatCop(visibleTotal)}</p>
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as TemplateSort)}
            aria-label="Ordenar obligaciones"
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-500"
          >
            <option value="name-asc">Nombre A→Z</option>
            <option value="name-desc">Nombre Z→A</option>
            <option value="category">Categoría</option>
          </select>
        </div>
      )}

      <BulkSelectBar
        selectedCount={visibleSelectedCount}
        totalCount={active.length}
        allSelected={allVisibleSelected}
        onToggleAll={toggleAllVisible}
        actions={[{ label: 'Limpiar', danger: true, onClick: () => setBulkDeleting(true) }]}
      />

      {loading && <p className="text-slate-400">Cargando…</p>}
      {!loading && allActive.length === 0 && (
        <p className="text-slate-500">Aún no tienes obligaciones fijas. Crea la primera.</p>
      )}
      {!loading && allActive.length > 0 && active.length === 0 && (
        <p className="text-slate-500">Ninguna obligación coincide con “{search}”.</p>
      )}

      <ul className="flex flex-col gap-2">
        {sortedActive.map((template) => (
          <li
            key={template.id}
            className={`flex items-center gap-3 rounded-xl border bg-white p-4 ${
              selected.has(template.id) ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-200'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(template.id)}
              onChange={() => toggleOne(template.id)}
              aria-label={`Seleccionar ${template.name}`}
              className="h-5 w-5 shrink-0 accent-slate-800"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800">{template.name}</p>
              <p className="text-xs text-slate-400">
                {formatCop(template.budgetedAmount)} ·{' '}
                {template.payKind === 'debt_payment'
                  ? 'Abono a deuda'
                  : (categoryName(template.categoryId) ?? 'Gasto')}
                {template.consumesBudget ? ' · en presupuesto' : ''}
              </p>
            </div>
            <ActionMenu
              ariaLabel={`Acciones de ${template.name}`}
              items={[
                { label: 'Editar', icon: Pencil, onSelect: () => setEditing(template) },
                { label: 'Archivar', icon: Archive, onSelect: () => handleArchive(template) },
                {
                  label: 'Eliminar',
                  icon: Trash2,
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
        budgets={budgets}
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
        budgets={budgets}
        onClose={() => setEditing(null)}
      />
      <ConfirmDeleteModal
        open={!!deleting}
        itemLabel={deleting?.name ?? ''}
        itemKind="la obligación fija"
        onConfirm={() => void handleDelete()}
        onClose={() => setDeleting(null)}
      />
      <ConfirmDeleteModal
        open={bulkDeleting}
        itemLabel={`${visibleSelectedCount} obligaciones fijas seleccionadas`}
        itemKind="obligaciones fijas"
        onConfirm={() => void handleBulkDelete()}
        onClose={() => setBulkDeleting(false)}
      />
    </>
  );
}
