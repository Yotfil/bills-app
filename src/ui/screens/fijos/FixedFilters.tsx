import { SelectField } from '../../components/SelectField';
import type { FixedStatus } from '../../../domain/types';
import type { FixedFiltersProps } from './FixedFiltersProps';

// Panel plegable de filtros de la pestaña Gastos de Fijos (§8.3): estado, categoría, medio de pago y
// "solo con cobro automático". Es CONTROLADO: el toggle "Filtros ▾/▴" y "Limpiar" viven en FijosScreen
// (en la misma fila que "Ordenar"); aquí solo se pinta el panel cuando `expanded`. SelectField usa ''
// como placeholder; aquí '' representa "todos" (sin filtrar esa dimensión).
const toSel = (v: string) => (v === 'all' ? '' : v);
const fromSel = (v: string) => (v === '' ? 'all' : v);

export function FixedFilters({
  filter,
  onChange,
  categoryOptions,
  methodOptions,
  expanded,
}: FixedFiltersProps) {
  if (!expanded) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Estado"
          value={toSel(filter.status)}
          onChange={(v) => onChange({ ...filter, status: fromSel(v) as FixedStatus | 'all' })}
          options={[
            { value: 'pending', label: 'Pendiente' },
            { value: 'allocated', label: 'Destinado' },
            { value: 'paid', label: 'Pagado' },
          ]}
          placeholder="Todos"
        />
        <SelectField
          label="Categoría"
          value={toSel(filter.categoryId)}
          onChange={(v) => onChange({ ...filter, categoryId: fromSel(v) })}
          options={categoryOptions}
          placeholder="Todas"
        />
        <SelectField
          label="Medio de pago"
          value={toSel(filter.methodKey)}
          onChange={(v) => onChange({ ...filter, methodKey: fromSel(v) })}
          options={methodOptions}
          placeholder="Todos"
        />
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={filter.autoOnly}
            onChange={(e) => onChange({ ...filter, autoOnly: e.target.checked })}
          />
          Solo cobro automático
        </label>
      </div>
    </div>
  );
}
