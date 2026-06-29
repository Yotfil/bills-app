import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { MoneyInput } from '../../components/MoneyInput';
import { SelectField } from '../../components/SelectField';
import { useSessionStore } from '../../../store/sessionStore';
import { createBudget } from '../../../data/budgetRepository';
import { setBudgetBackedBase } from '../../../data/budgetFixedService';
import { fixedCap } from '../../../domain/budgetBackedFixed';
import { formatCop } from '../../../lib/currency';
import type { BudgetFormProps } from './BudgetFormProps';

// Crear/editar un presupuesto por categoría (CLAUDE.md §5.9). Al crear, solo se ofrecen
// categorías que aún no tienen presupuesto (uno por categoría).
export function BudgetForm({
  open,
  budget,
  categories,
  usedCategoryIds,
  linkedFixed,
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
        // Presupuestos edita la BASE recurrente (§5.9): actualiza el tope, y si la categoría tiene un
        // fijo respaldado, también la plantilla y la base del mes en curso/futuros. Los meses con un
        // override puntual (`capOverride`) se conservan; se cambian desde Fijos ("Editar tope").
        await setBudgetBackedBase(uid, budget.categoryId, monthlyLimit);
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
          placeholder={linkedFixed ? 'Tope base, cada mes inicia aquí (COP)' : 'Tope mensual (COP)'}
          value={limit}
          onChange={setLimit}
          className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
        />
        {linkedFixed?.capOverride != null && (
          // Este mes tiene un ajuste puntual (override): cambiar la base no lo pisa (§5.9).
          <p className="text-xs text-amber-700">
            Este mes está ajustado a {formatCop(fixedCap(linkedFixed))} (cámbialo en Fijos → “Editar
            tope”). Aquí editas la base de cada mes.
          </p>
        )}
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
