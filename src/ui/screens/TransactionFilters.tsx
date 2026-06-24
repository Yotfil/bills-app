import { useState } from 'react';
import { SearchBar } from '../components/SearchBar';
import { SelectField } from '../components/SelectField';
import { refToValue } from '../../lib/entityRef';
import { dayEndMillis, dayStartMillis, millisToDateInput } from '../../lib/date';
import { EMPTY_TRANSACTION_FILTER, isFilterActive } from '../../domain/transactionFilters';
import type { TransactionType } from '../../domain/types';
import type { TransactionFiltersProps } from './TransactionFiltersProps';

// Etiquetas de tipo de movimiento para el desplegable (mismas que usa el formulario, §8.2).
const TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
  debt_payment: 'Abono a deuda',
  adjustment: 'Ajuste',
};

// Panel de filtros del Registro (§8.2): búsqueda de texto siempre visible y, plegados, los
// filtros por tipo, categoría, cuenta/medio y rango de fechas. La búsqueda reutiliza el
// componente compartido `SearchBar`; aquí solo se añaden los filtros propios del libro.
export function TransactionFilters({
  filter,
  onChange,
  categories,
  accounts,
  cards,
  loans,
}: TransactionFiltersProps) {
  const [expanded, setExpanded] = useState(false);
  const active = isFilterActive(filter);

  const typeOptions = (Object.keys(TYPE_LABELS) as TransactionType[]).map((t) => ({
    value: t,
    label: TYPE_LABELS[t],
  }));
  const categoryOptions = categories
    .filter((c) => !c.archived)
    .map((c) => ({ value: c.id, label: c.name }));
  const entityOptions = [
    ...accounts
      .filter((a) => !a.archived)
      .map((a) => ({ value: refToValue({ kind: 'account', id: a.id }), label: a.name })),
    ...cards
      .filter((c) => !c.archived)
      .map((c) => ({ value: refToValue({ kind: 'card', id: c.id }), label: c.name })),
    ...loans
      .filter((l) => !l.archived)
      .map((l) => ({ value: refToValue({ kind: 'loan', id: l.id }), label: l.name })),
  ];

  return (
    <div className="flex flex-col gap-2">
      <SearchBar
        value={filter.text}
        onChange={(text) => onChange({ ...filter, text })}
        placeholder="Buscar movimiento…"
      />

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-slate-500 underline"
        >
          Filtros {expanded ? '▴' : '▾'}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_TRANSACTION_FILTER)}
            className="text-slate-400 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <SelectField
            label="Tipo"
            value={filter.type === 'all' ? '' : filter.type}
            onChange={(v) => onChange({ ...filter, type: v ? (v as TransactionType) : 'all' })}
            options={typeOptions}
            placeholder="Todos los tipos"
          />
          <SelectField
            label="Categoría"
            value={filter.categoryId ?? ''}
            onChange={(v) => onChange({ ...filter, categoryId: v || null })}
            options={categoryOptions}
            placeholder="Todas las categorías"
          />
          <SelectField
            label="Cuenta / medio"
            value={filter.entityKey ?? ''}
            onChange={(v) => onChange({ ...filter, entityKey: v || null })}
            options={entityOptions}
            placeholder="Todas las cuentas"
          />
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-slate-400">Desde</span>
              <input
                type="date"
                value={filter.fromMillis ? millisToDateInput(filter.fromMillis) : ''}
                onChange={(e) =>
                  onChange({
                    ...filter,
                    fromMillis: e.target.value ? dayStartMillis(e.target.value) : null,
                  })
                }
                className="rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-slate-500"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-slate-400">Hasta</span>
              <input
                type="date"
                value={filter.toMillis ? millisToDateInput(filter.toMillis) : ''}
                onChange={(e) =>
                  onChange({
                    ...filter,
                    toMillis: e.target.value ? dayEndMillis(e.target.value) : null,
                  })
                }
                className="rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-slate-500"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
