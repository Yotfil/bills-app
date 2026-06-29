import { useMemo, useState } from 'react';
import { Modal } from '../../components/Modal';
import { formatCop } from '../../../lib/currency';
import type { FixedChangedField, FixedTemplateChange } from '../../../domain/fixedTemplateSync';
import type {
  FixedObligationMonthly,
  FixedObligationTemplate,
} from '../../../domain/types';
import type { FixedSyncModalProps, FixedSyncSelection } from './FixedSyncModalProps';

// Modal de sincronización plantilla→fijos del mes (CLAUDE.md §5.2, §5.10). Lista lo que se va a
// Agregar / Actualizar / Quitar con un checkbox por ítem (marcado por defecto). Lo no marcado no se
// toca. La aplicación real la hace la pantalla de Fijos vía las funciones del repositorio.

const FIELD_LABEL: Record<FixedChangedField, string> = {
  name: 'Nombre',
  budgetedAmount: 'Monto',
  categoryId: 'Categoría',
  payKind: 'Tipo',
  debtTargetId: 'Deuda destino',
  consumesBudget: 'Consume de un presupuesto',
  paymentMethod: 'Medio de pago',
};

export function FixedSyncModal({
  open,
  diff,
  monthLabel,
  categories,
  cards,
  loans,
  onApply,
  onClose,
}: FixedSyncModalProps) {
  // Selección por ítem; al abrir, todo viene marcado (la acción común es "aplicar todo").
  const [add, setAdd] = useState<Set<string>>(new Set());
  const [update, setUpdate] = useState<Set<string>>(new Set());
  const [remove, setRemove] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Reinicia la selección (todo marcado) en el flanco de apertura. Patrón endorsado de React:
  // ajustar estado durante el render en lugar de un useEffect (evita renders en cascada).
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setAdd(new Set(diff.toAdd.map((t) => t.id)));
    setUpdate(new Set(diff.toUpdate.map((c) => c.fixed.id)));
    setRemove(new Set(diff.toRemove.map((f) => f.id)));
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const categoryName = useMemo(
    () => (id: string) => categories.find((c) => c.id === id)?.name ?? '—',
    [categories],
  );
  const debtName = useMemo(
    () => (id: string | null) => {
      if (!id) return '—';
      return (
        cards.find((c) => c.id === id)?.name ?? loans.find((l) => l.id === id)?.name ?? 'deuda'
      );
    },
    [cards, loans],
  );

  function fieldValue(
    field: FixedChangedField,
    source: FixedObligationMonthly | FixedObligationTemplate,
  ): string {
    switch (field) {
      case 'name':
        return source.name;
      case 'budgetedAmount':
        return formatCop(source.budgetedAmount);
      case 'categoryId':
        return categoryName(source.categoryId);
      case 'payKind':
        return source.payKind === 'debt_payment' ? 'Abono a deuda' : 'Gasto';
      case 'debtTargetId':
        return debtName(source.debtTargetId);
      case 'consumesBudget':
        return source.consumesBudget ? 'Sí' : 'No';
      case 'paymentMethod': {
        const ref = 'paymentMethod' in source ? source.paymentMethod : source.defaultPaymentMethod;
        return `${ref.kind === 'card' ? 'TC ' : ''}${ref.id}`;
      }
    }
  }

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  }

  const selectedCount = add.size + update.size + remove.size;

  async function handleApply() {
    setBusy(true);
    try {
      const selection: FixedSyncSelection = { add, update, remove };
      await onApply(selection);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Actualizar fijos del mes" onClose={onClose}>
      <p className="mb-3 text-sm text-slate-500">
        Cambios de la plantilla para <span className="capitalize">{monthLabel}</span>. Marca lo que
        quieras aplicar; lo demás se queda igual.
      </p>

      <div className="flex flex-col gap-4">
        {diff.toAdd.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
              Agregar ({diff.toAdd.length})
            </h3>
            <ul className="flex flex-col gap-2">
              {diff.toAdd.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <input
                    type="checkbox"
                    checked={add.has(t.id)}
                    onChange={() => toggle(add, setAdd, t.id)}
                    aria-label={`Agregar ${t.name}`}
                    className="h-5 w-5 shrink-0 accent-slate-800"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400">{formatCop(t.budgetedAmount)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {diff.toUpdate.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-amber-700 uppercase">
              Actualizar ({diff.toUpdate.length})
            </h3>
            <ul className="flex flex-col gap-2">
              {diff.toUpdate.map((change: FixedTemplateChange) => (
                <li
                  key={change.fixed.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <input
                    type="checkbox"
                    checked={update.has(change.fixed.id)}
                    onChange={() => toggle(update, setUpdate, change.fixed.id)}
                    aria-label={`Actualizar ${change.fixed.name}`}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-slate-800"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {change.fixed.name}
                    </p>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {change.changedFields.map((f) => (
                        <li key={f} className="text-xs text-slate-500">
                          {FIELD_LABEL[f]}:{' '}
                          <span className="text-slate-400 line-through">
                            {fieldValue(f, change.fixed)}
                          </span>{' '}
                          → <span className="text-slate-700">{fieldValue(f, change.template)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {diff.toRemove.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-red-700 uppercase">
              Quitar ({diff.toRemove.length})
            </h3>
            <ul className="flex flex-col gap-2">
              {diff.toRemove.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <input
                    type="checkbox"
                    checked={remove.has(f.id)}
                    onChange={() => toggle(remove, setRemove, f.id)}
                    aria-label={`Quitar ${f.name}`}
                    className="h-5 w-5 shrink-0 accent-slate-800"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{f.name}</p>
                    <p className="text-xs text-slate-400">
                      {f.status === 'paid'
                        ? 'Estaba pagado: se revertirá su movimiento'
                        : 'Su plantilla fue eliminada o archivada'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-600"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={busy || selectedCount === 0}
          className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          Aplicar {selectedCount > 0 ? `(${selectedCount})` : ''}
        </button>
      </div>
    </Modal>
  );
}
