import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { MoneyInput } from '../../components/MoneyInput';
import { SelectField } from '../../components/SelectField';
import { useSessionStore } from '../../../store/sessionStore';
import { createBudget, updateBudget } from '../../../data/budgetRepository';
import { syncMonthlyFromBudget } from '../../../data/budgetFixedService';
import { currentMonthKey } from '../../../lib/date';
import type { BudgetFormProps } from './BudgetFormProps';

// Crear/editar un presupuesto por categoría (CLAUDE.md §5.9). Al crear, solo se ofrecen
// categorías que aún no tienen presupuesto (uno por categoría).
export function BudgetForm({
  open,
  budget,
  categories,
  usedCategoryIds,
  onClose,
}: BudgetFormProps) {
  const uid = useSessionStore((s) => s.user?.uid);
  const isEdit = !!budget;
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? '');
  const [limit, setLimit] = useState(String(budget?.monthlyLimit ?? ''));
  const [busy, setBusy] = useState(false);
  const formKey = budget?.id ?? 'new';

  const used = new Set(usedCategoryIds.filter((id) => id !== budget?.categoryId));
  const options = categories
    .filter((c) => !c.archived && !c.isSystem && !used.has(c.id))
    .map((c) => ({ value: c.id, label: c.name }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const monthlyLimit = Math.round(Number(limit) || 0);
    if (!uid || !categoryId || monthlyLimit <= 0) return;
    setBusy(true);
    try {
      if (isEdit && budget) {
        await updateBudget(uid, budget.id, { monthlyLimit });
        // Espejo presupuesto→fijo (§5.9): si hay fijos respaldados de esta categoría en el mes en
        // curso, su monto se actualiza al nuevo tope. No toca la plantilla.
        await syncMonthlyFromBudget(uid, { ...budget, monthlyLimit }, monthlyLimit, currentMonthKey());
      } else {
        await createBudget(uid, { categoryId, monthlyLimit });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      onClose={onClose}
    >
      <form key={formKey} onSubmit={handleSubmit} className="flex flex-col gap-3">
        {isEdit ? (
          <p className="text-sm text-slate-500">
            Categoría: {categories.find((c) => c.id === budget?.categoryId)?.name}
          </p>
        ) : (
          <SelectField
            label="Categoría"
            value={categoryId}
            onChange={setCategoryId}
            options={options}
            placeholder="Selecciona categoría…"
          />
        )}
        <MoneyInput
          autoFocus
          placeholder="Tope mensual (COP)"
          value={limit}
          onChange={setLimit}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-slate-800 py-3 font-medium text-white disabled:opacity-50"
        >
          {isEdit ? 'Guardar' : 'Crear presupuesto'}
        </button>
      </form>
    </Modal>
  );
}
